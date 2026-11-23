package services

import (
	"context"
	"math"
	"testing"

	"projectfai/backend/internal/models"
)

// pinned returns a property with a map pin at the given coordinate.
func pinned(lat, lng float64) *models.Property {
	return &models.Property{Latitude: &lat, Longitude: &lng}
}

// TestHaversineMeters checks the distance formula against one degree of latitude (~111.2 km).
func TestHaversineMeters(t *testing.T) {
	d := haversineMeters(-7.0, 109.0, -8.0, 109.0)
	if math.Abs(d-111_195) > 200 {
		t.Fatalf("one degree of latitude = %.0f m, want ~111195 m", d)
	}
}

// TestLocationVerdict covers every verdict a buyer can see for a room.
func TestLocationVerdict(t *testing.T) {
	near := &models.GeoFix{Lat: -7.4245, Lng: 109.2302, AccuracyM: 30}    // about 60 m from the pin
	far := &models.GeoFix{Lat: -7.4300, Lng: 109.2302, AccuracyM: 20}     // about 670 m from the pin
	coarse := &models.GeoFix{Lat: -7.4240, Lng: 109.2302, AccuracyM: 900} // network-only fix
	pin := pinned(-7.4240, 109.2300)
	cases := []struct {
		name string
		room models.TourRoom
		prop *models.Property
		want string
	}{
		{"imported photo", models.TourRoom{Source: models.TourSourceImport, CaptureFix: near}, pin, models.LocationNotLive},
		{"legacy room", models.TourRoom{Source: models.TourSourceUnknown}, pin, models.LocationNotLive},
		{"no gps", models.TourRoom{Source: models.TourSourceCapture}, pin, models.LocationNoGPS},
		{"no pin", models.TourRoom{Source: models.TourSourceCapture, CaptureFix: near}, &models.Property{}, models.LocationNoPin},
		{"imprecise", models.TourRoom{Source: models.TourSourceCapture, CaptureFix: coarse}, pin, models.LocationImprecise},
		{"verified", models.TourRoom{Source: models.TourSourceCapture, CaptureFix: near}, pin, models.LocationVerified},
		{"far", models.TourRoom{Source: models.TourSourceCapture, CaptureFix: far}, pin, models.LocationFar},
	}
	for _, c := range cases {
		if got := locationVerdict(c.room, c.prop); got != c.want {
			t.Errorf("%s: got %q, want %q", c.name, got, c.want)
		}
	}
}

// TestCaptureExtrasNormalize rejects impossible readings and clamps huge accuracy values.
func TestCaptureExtrasNormalize(t *testing.T) {
	if err := (CaptureExtras{CameraHeightCm: 20}).normalize(); err == nil {
		t.Fatal("expected a 20 cm camera height to be rejected")
	}
	if err := (CaptureExtras{Location: &models.GeoFix{Lat: 120, Lng: 10, AccuracyM: 5}}).normalize(); err == nil {
		t.Fatal("expected latitude 120 to be rejected")
	}
	fix := &models.GeoFix{Lat: -7.4, Lng: 109.2, AccuracyM: 200_000}
	if err := (CaptureExtras{CameraHeightCm: 150, Location: fix}).normalize(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fix.AccuracyM != maxReportedAccuracy {
		t.Fatalf("accuracy %d was not clamped to %d", fix.AccuracyM, maxReportedAccuracy)
	}
}

// TestStartCaptureRecordsOrigin verifies a live capture keeps its source, camera height, and GPS fix.
func TestStartCaptureRecordsOrigin(t *testing.T) {
	svc, tours, _, _ := newTourFixture(t)
	fix := &models.GeoFix{Lat: -7.4245, Lng: 109.2302, AccuracyM: 25}
	room, err := svc.StartCapture(context.Background(), 1, 1, "Kamar", testCaptureFrames(12, 320, 400),
		CaptureExtras{CameraHeightCm: 148, Location: fix})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	stored := tours.rooms[room.ID]
	if stored.Source != models.TourSourceCapture || stored.CameraHeightCm != 148 || stored.CaptureFix == nil {
		t.Fatalf("capture origin not stored: %+v", stored)
	}
}
