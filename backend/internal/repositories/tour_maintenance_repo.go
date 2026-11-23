package repositories

import (
	"context"
	"strings"

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

// prefixedRoomColumns qualifies every room column with the "t" alias for join queries. It is derived from
// tourRoomColumns so join queries always return exactly the columns scanTourRoom reads.
var prefixedRoomColumns = prefixColumns(tourRoomColumns, "t")

// prefixColumns prepends a table alias to each name of a comma-separated column list.
func prefixColumns(columns, alias string) string {
	parts := strings.Split(columns, ",")
	for i, part := range parts {
		parts[i] = alias + "." + strings.TrimSpace(part)
	}
	return strings.Join(parts, ", ")
}
