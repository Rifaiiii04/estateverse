package repositories

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"projectfai/backend/internal/models"
)

// AddHotspot inserts a navigation marker between two rooms.
func (r *mysqlTourRepo) AddHotspot(ctx context.Context, h *models.TourHotspot) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO tour_hotspots (from_room_id, to_room_id, yaw, pitch) VALUES (?, ?, ?, ?)`,
		h.FromRoomID, h.ToRoomID, h.Yaw, h.Pitch)
	if err != nil {
		return err
	}
	h.ID, err = res.LastInsertId()
	return err
}

// GetHotspot loads one hotspot so callers can verify room ownership before changes.
func (r *mysqlTourRepo) GetHotspot(ctx context.Context, id int64) (*models.TourHotspot, error) {
	var h models.TourHotspot
	err := r.db.QueryRowContext(ctx,
		`SELECT id, from_room_id, to_room_id, yaw, pitch FROM tour_hotspots WHERE id = ?`, id,
	).Scan(&h.ID, &h.FromRoomID, &h.ToRoomID, &h.Yaw, &h.Pitch)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &h, err
}

// DeleteHotspot removes a navigation marker.
func (r *mysqlTourRepo) DeleteHotspot(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM tour_hotspots WHERE id = ?`, id)
	return err
}

// attachHotspots loads hotspots for all given rooms in one query and assigns them in place.
func (r *mysqlTourRepo) attachHotspots(ctx context.Context, rooms []models.TourRoom) error {
	if len(rooms) == 0 {
		return nil
	}
	index := make(map[int64]int, len(rooms))
	args := make([]interface{}, len(rooms))
	for i, room := range rooms {
		index[room.ID] = i
		args[i] = room.ID
	}
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(rooms)), ",")
	rows, err := r.db.QueryContext(ctx, `SELECT id, from_room_id, to_room_id, yaw, pitch FROM tour_hotspots
		WHERE from_room_id IN (`+placeholders+`) ORDER BY id`, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var h models.TourHotspot
		if err := rows.Scan(&h.ID, &h.FromRoomID, &h.ToRoomID, &h.Yaw, &h.Pitch); err != nil {
			return err
		}
		i := index[h.FromRoomID]
		rooms[i].Hotspots = append(rooms[i].Hotspots, h)
	}
	return rows.Err()
}
