package repositories

import (
	"context"

	"projectfai/backend/internal/models"
)

// DeleteOrphanRooms removes rooms whose property no longer exists and returns them for file cleanup.
func (r *mysqlTourRepo) DeleteOrphanRooms(ctx context.Context) ([]models.TourRoom, error) {
	rooms, err := r.queryRooms(ctx, `SELECT `+prefixedRoomColumns+` FROM property_tour_rooms t
		LEFT JOIN properties p ON p.id = t.property_id WHERE p.id IS NULL`)
	if err != nil || len(rooms) == 0 {
		return rooms, err
	}
	_, err = r.db.ExecContext(ctx, `DELETE t FROM property_tour_rooms t
		LEFT JOIN properties p ON p.id = t.property_id WHERE p.id IS NULL`)
	return rooms, err
}

// prefixedRoomColumns qualifies room columns with the "t" alias for join queries.
const prefixedRoomColumns = `t.id, t.property_id, t.name, t.note, t.status, t.panorama_path, t.preview_path,
	t.quality_score, t.error_message, t.sort_order, t.created_at`
