package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"projectfai/backend/internal/models"
)

// TourRepository persists 360° tour rooms and their navigation hotspots.
type TourRepository interface {
	CreateRoom(ctx context.Context, room *models.TourRoom) error
	GetRoom(ctx context.Context, id int64) (*models.TourRoom, error)
	ListRooms(ctx context.Context, propertyID int64, readyOnly bool) ([]models.TourRoom, error)
	ListProcessing(ctx context.Context) ([]models.TourRoom, error)
	MarkReady(ctx context.Context, id int64, panoramaPath, previewPath string, quality int) error
	MarkFailed(ctx context.Context, id int64, message string) error
	UpdateRoom(ctx context.Context, id int64, name, note string) error
	SaveLayout(ctx context.Context, id int64, layout models.RoomLayout) error
	DeleteRoom(ctx context.Context, id int64) error
	ReorderRooms(ctx context.Context, propertyID int64, orderedIDs []int64) error
	AddHotspot(ctx context.Context, h *models.TourHotspot) error
	GetHotspot(ctx context.Context, id int64) (*models.TourHotspot, error)
	DeleteHotspot(ctx context.Context, id int64) error
	DeleteOrphanRooms(ctx context.Context) ([]models.TourRoom, error)
}

type mysqlTourRepo struct {
	db *sql.DB
}

// NewTourRepository instantiates a MySQL-backed tour repository.
func NewTourRepository(db *sql.DB) TourRepository {
	return &mysqlTourRepo{db: db}
}

const tourRoomColumns = `id, property_id, name, note, source, camera_height_cm, floor_outline,
	capture_lat, capture_lng, capture_accuracy_m, status, panorama_path, preview_path,
	quality_score, error_message, sort_order, created_at`

// CreateRoom inserts a room at the end of the property's room order.
func (r *mysqlTourRepo) CreateRoom(ctx context.Context, room *models.TourRoom) error {
	query := `INSERT INTO property_tour_rooms (property_id, name, source, camera_height_cm, capture_lat, capture_lng,
		capture_accuracy_m, status, panorama_path, preview_path, quality_score, sort_order)
		SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(MAX(sort_order), -1) + 1 FROM property_tour_rooms WHERE property_id = ?`
	lat, lng, accuracy := fixColumns(room.CaptureFix)
	res, err := r.db.ExecContext(ctx, query, room.PropertyID, room.Name, sourceOrUnknown(room.Source), room.CameraHeightCm,
		lat, lng, accuracy, room.Status, room.PanoramaPath, room.PreviewPath, room.QualityScore, room.PropertyID)
	if err != nil {
		return fmt.Errorf("failed inserting tour room: %w", err)
	}
	room.ID, err = res.LastInsertId()
	return err
}

// GetRoom loads a single room without hotspots.
func (r *mysqlTourRepo) GetRoom(ctx context.Context, id int64) (*models.TourRoom, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+tourRoomColumns+` FROM property_tour_rooms WHERE id = ?`, id)
	room, err := scanTourRoom(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return room, err
}

// ListRooms returns a property's rooms in display order, each with its hotspots.
func (r *mysqlTourRepo) ListRooms(ctx context.Context, propertyID int64, readyOnly bool) ([]models.TourRoom, error) {
	query := `SELECT ` + tourRoomColumns + ` FROM property_tour_rooms WHERE property_id = ?`
	if readyOnly {
		query += ` AND status = 'ready'`
	}
	rooms, err := r.queryRooms(ctx, query+` ORDER BY sort_order, id`, propertyID)
	if err != nil {
		return nil, err
	}
	return rooms, r.attachHotspots(ctx, rooms)
}

// ListProcessing returns rooms whose stitching was interrupted, for recovery after a restart.
func (r *mysqlTourRepo) ListProcessing(ctx context.Context) ([]models.TourRoom, error) {
	return r.queryRooms(ctx, `SELECT `+tourRoomColumns+` FROM property_tour_rooms WHERE status = 'processing' ORDER BY id`)
}

// MarkReady stores the stitched panorama paths and quality score.
func (r *mysqlTourRepo) MarkReady(ctx context.Context, id int64, panoramaPath, previewPath string, quality int) error {
	_, err := r.db.ExecContext(ctx, `UPDATE property_tour_rooms
		SET status = 'ready', panorama_path = ?, preview_path = ?, quality_score = ?, error_message = '' WHERE id = ?`,
		panoramaPath, previewPath, quality, id)
	return err
}

// MarkFailed records why stitching failed so the seller can re-record.
func (r *mysqlTourRepo) MarkFailed(ctx context.Context, id int64, message string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE property_tour_rooms SET status = 'failed', error_message = ? WHERE id = ?`,
		truncate(message, 255), id)
	return err
}

// UpdateRoom changes a room's display name and seller note.
func (r *mysqlTourRepo) UpdateRoom(ctx context.Context, id int64, name, note string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE property_tour_rooms SET name = ?, note = ? WHERE id = ?`, name, note, id)
	return err
}

// DeleteRoom removes a room; hotspots pointing to or from it cascade.
func (r *mysqlTourRepo) DeleteRoom(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM property_tour_rooms WHERE id = ?`, id)
	return err
}

// ReorderRooms assigns sort positions following the given room id order within one property.
func (r *mysqlTourRepo) ReorderRooms(ctx context.Context, propertyID int64, orderedIDs []int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for pos, id := range orderedIDs {
		_, err := tx.ExecContext(ctx, `UPDATE property_tour_rooms SET sort_order = ? WHERE id = ? AND property_id = ?`,
			pos, id, propertyID)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// queryRooms runs a room SELECT and scans every row.
func (r *mysqlTourRepo) queryRooms(ctx context.Context, query string, args ...interface{}) ([]models.TourRoom, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	rooms := []models.TourRoom{}
	for rows.Next() {
		room, err := scanTourRoom(rows)
		if err != nil {
			return nil, err
		}
		rooms = append(rooms, *room)
	}
	return rooms, rows.Err()
}

// truncate shortens a string to at most n bytes for bounded columns.
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
