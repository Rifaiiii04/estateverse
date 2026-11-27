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
	AcceptCapture(ctx context.Context, ownerID int64, room *models.TourRoom, key string, digest []byte, store func(int64) error) (bool, error)
	GetRoom(ctx context.Context, id int64) (*models.TourRoom, error)
	ListRooms(ctx context.Context, propertyID int64, readyOnly bool) ([]models.TourRoom, error)
	ListProcessing(ctx context.Context) ([]models.TourRoom, error)
	MarkReady(ctx context.Context, id int64, panoramaPath, previewPath string, quality int) error
	MarkFailed(ctx context.Context, id int64, message string) error
	UpdateRoom(ctx context.Context, id int64, name, note string) error
	SaveLayout(ctx context.Context, id int64, layout models.RoomLayout) error
	DeleteRoom(ctx context.Context, id int64) (*models.TourRoom, error)
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
	return insertTourRoom(ctx, r.db, room, "", nil)
}

// insertTourRoom shares the same room ordering and optional receipt across transactions and ordinary imports.
func insertTourRoom(ctx context.Context, db interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}, room *models.TourRoom, key string, digest []byte) error {
	query := `INSERT INTO property_tour_rooms (property_id, name, source, camera_height_cm, capture_lat, capture_lng,
		capture_accuracy_m, status, panorama_path, preview_path, quality_score, capture_id, capture_digest, sort_order)
		SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), ?, COALESCE(MAX(sort_order), -1) + 1 FROM property_tour_rooms WHERE property_id = ?`
	lat, lng, accuracy := fixColumns(room.CaptureFix)
	res, err := db.ExecContext(ctx, query, room.PropertyID, room.Name, sourceOrUnknown(room.Source), room.CameraHeightCm,
		lat, lng, accuracy, room.Status, room.PanoramaPath, room.PreviewPath, room.QualityScore, key, digest, room.PropertyID)
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

// ErrTourNotProcessing identifies a room that was deleted or already has a terminal stitching outcome.
var ErrTourNotProcessing = errors.New("tour room is no longer processing")

// MarkReady attaches newly written files only if this job wins the transition from processing.
func (r *mysqlTourRepo) MarkReady(ctx context.Context, id int64, panoramaPath, previewPath string, quality int) error {
	return stitchTransition(r.db.ExecContext(ctx, `UPDATE property_tour_rooms
		SET status = 'ready', panorama_path = ?, preview_path = ?, quality_score = ?, error_message = ''
		WHERE id = ? AND status = 'processing'`, panoramaPath, previewPath, quality, id))
}

// MarkFailed records why stitching failed so the seller can re-record.
func (r *mysqlTourRepo) MarkFailed(ctx context.Context, id int64, message string) error {
	return stitchTransition(r.db.ExecContext(ctx, `UPDATE property_tour_rooms SET status = 'failed', error_message = ?
		WHERE id = ? AND status = 'processing'`, truncate(message, 255), id))
}

// stitchTransition distinguishes a successful worker update from a deleted room or previously completed job.
func stitchTransition(result sql.Result, err error) error {
	if err != nil {
		return err
	}
	changed, err := result.RowsAffected()
	if err == nil && changed == 0 {
		return ErrTourNotProcessing
	}
	return err
}

// UpdateRoom changes a room's display name and seller note.
func (r *mysqlTourRepo) UpdateRoom(ctx context.Context, id int64, name, note string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE property_tour_rooms SET name = ?, note = ? WHERE id = ?`, name, note, id)
	return err
}

// DeleteRoom returns the exact room removed so a concurrent stitch cannot leave newly attached files behind.
func (r *mysqlTourRepo) DeleteRoom(ctx context.Context, id int64) (*models.TourRoom, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	room, err := scanTourRoom(tx.QueryRowContext(ctx, `SELECT `+tourRoomColumns+` FROM property_tour_rooms WHERE id = ? FOR UPDATE`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM property_tour_rooms WHERE id = ?`, id); err != nil {
		return nil, err
	}
	return room, tx.Commit()
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
