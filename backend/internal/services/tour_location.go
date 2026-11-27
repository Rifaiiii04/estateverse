package services

import (
	"math"

	"projectfai/backend/internal/models"
)

const (
	earthRadiusM        = 6_371_000.0
	verifyRadiusM       = 100.0
	maxUsableAccuracyM  = 150
	maxReportedAccuracy = 65_535
)

// CaptureExtras are the optional measurements a phone sends with a live capture.
type CaptureExtras struct {
	CaptureID      string
	CameraHeightCm int
	Location       *models.GeoFix
}

// normalize validates the optional camera height and GPS fix, clamping accuracy to the stored column range.
func (e CaptureExtras) normalize() error {
	if err := validateCameraHeight(e.CameraHeightCm, false); err != nil {
		return err
	}
	if e.Location == nil {
		return nil
	}
	if !validCoordinate(e.Location.Lat, e.Location.Lng) || e.Location.AccuracyM <= 0 {
		return newValidationError("data lokasi GPS tidak valid")
	}
	e.Location.AccuracyM = min(e.Location.AccuracyM, maxReportedAccuracy)
	return nil
}

// validCoordinate reports whether a latitude/longitude pair is finite and inside the globe's range.
func validCoordinate(lat, lng float64) bool {
	finite := !math.IsNaN(lat) && !math.IsNaN(lng) && !math.IsInf(lat, 0) && !math.IsInf(lng, 0)
	return finite && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// annotateLocation fills each room's location verdict against the property's map pin.
func annotateLocation(rooms []models.TourRoom, prop *models.Property) []models.TourRoom {
	for i := range rooms {
		rooms[i].LocationCheck = locationVerdict(rooms[i], prop)
	}
	return rooms
}

// locationVerdict decides whether a room was recorded live near the listing pin, allowing for GPS accuracy.
func locationVerdict(room models.TourRoom, prop *models.Property) string {
	if room.Source != models.TourSourceCapture {
		return models.LocationNotLive
	}
	if room.CaptureFix == nil {
		return models.LocationNoGPS
	}
	if prop == nil || prop.Latitude == nil || prop.Longitude == nil {
		return models.LocationNoPin
	}
	if room.CaptureFix.AccuracyM > maxUsableAccuracyM {
		return models.LocationImprecise
	}
	distance := haversineMeters(room.CaptureFix.Lat, room.CaptureFix.Lng, *prop.Latitude, *prop.Longitude)
	if distance <= verifyRadiusM+float64(room.CaptureFix.AccuracyM) {
		return models.LocationVerified
	}
	return models.LocationFar
}

// haversineMeters returns the great-circle distance between two coordinates in metres.
func haversineMeters(lat1, lng1, lat2, lng2 float64) float64 {
	toRad := math.Pi / 180
	dLat := (lat2 - lat1) * toRad
	dLng := (lng2 - lng1) * toRad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*toRad)*math.Cos(lat2*toRad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadiusM * math.Asin(math.Min(1, math.Sqrt(a)))
}
