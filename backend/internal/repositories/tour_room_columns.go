package repositories

import (
	"context"
	"database/sql"
	"encoding/json"

	"projectfai/backend/internal/models"
)

// SaveLayout stores the seller-calibrated camera height and traced floor outline of a room.
func (r *mysqlTourRepo) SaveLayout(ctx context.Context, id int64, layout models.RoomLayout) error {
	outline, err := json.Marshal(nonNilOutline(layout.FloorOutline))
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `UPDATE property_tour_rooms SET camera_height_cm = ?, floor_outline = ? WHERE id = ?`,
		layout.CameraHeightCm, string(outline), id)
	return err
}

// scanTourRoom maps one row into a TourRoom with an empty hotspot list.
func scanTourRoom(s rowScanner) (*models.TourRoom, error) {
	room := models.TourRoom{Hotspots: []models.TourHotspot{}}
	var outline string
	var lat, lng sql.NullFloat64
	var accuracy sql.NullInt64
	err := s.Scan(&room.ID, &room.PropertyID, &room.Name, &room.Note, &room.Source, &room.CameraHeightCm, &outline,
		&lat, &lng, &accuracy, &room.Status, &room.PanoramaPath, &room.PreviewPath,
		&room.QualityScore, &room.ErrorMessage, &room.SortOrder, &room.CreatedAt)
	if err != nil {
		return nil, err
	}
	room.FloorOutline = parseOutline(outline)
	if lat.Valid && lng.Valid {
		room.CaptureFix = &models.GeoFix{Lat: lat.Float64, Lng: lng.Float64, AccuracyM: int(accuracy.Int64)}
	}
	return &room, nil
}

// parseOutline decodes the stored floor outline, treating malformed data as "not traced yet".
func parseOutline(raw string) []models.FloorPoint {
	var points []models.FloorPoint
	if err := json.Unmarshal([]byte(raw), &points); err != nil {
		return []models.FloorPoint{}
	}
	return nonNilOutline(points)
}

// nonNilOutline keeps JSON output as [] instead of null when no corners were traced.
func nonNilOutline(points []models.FloorPoint) []models.FloorPoint {
	if points == nil {
		return []models.FloorPoint{}
	}
	return points
}

// fixColumns converts an optional GPS fix into nullable column values.
func fixColumns(fix *models.GeoFix) (interface{}, interface{}, interface{}) {
	if fix == nil {
		return nil, nil, nil
	}
	return fix.Lat, fix.Lng, fix.AccuracyM
}

// sourceOrUnknown guards the ENUM column against empty sources from older call sites.
func sourceOrUnknown(source string) string {
	switch source {
	case models.TourSourceCapture, models.TourSourceImport:
		return source
	default:
		return models.TourSourceUnknown
	}
}
