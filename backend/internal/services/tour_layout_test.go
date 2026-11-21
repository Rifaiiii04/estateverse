package services

import (
	"context"
	"testing"

	"projectfai/backend/internal/models"
)

// squareOutline returns four floor corners around the camera, all below the horizon.
func squareOutline() []models.FloorPoint {
	return []models.FloorPoint{{Yaw: 45, Pitch: -30}, {Yaw: 135, Pitch: -30}, {Yaw: -135, Pitch: -30}, {Yaw: -45, Pitch: -30}}
}

// TestValidateLayout accepts a plausible room and rejects bad heights, too few corners, and corners on walls.
func TestValidateLayout(t *testing.T) {
	if err := validateLayout(models.RoomLayout{CameraHeightCm: 150, FloorOutline: squareOutline()}); err != nil {
		t.Fatalf("valid layout rejected: %v", err)
	}
	if err := validateLayout(models.RoomLayout{CameraHeightCm: 150}); err != nil {
		t.Fatalf("height-only layout rejected: %v", err)
	}
	onWall := append(squareOutline()[:3], models.FloorPoint{Yaw: 0, Pitch: 10})
	bad := map[string]models.RoomLayout{
		"missing height": {FloorOutline: squareOutline()},
		"too tall":       {CameraHeightCm: 300},
		"two corners":    {CameraHeightCm: 150, FloorOutline: squareOutline()[:2]},
		"above horizon":  {CameraHeightCm: 150, FloorOutline: onWall},
	}
	for name, layout := range bad {
		if err := validateLayout(layout); err == nil {
			t.Errorf("%s: expected a validation error", name)
		}
	}
}

// TestSaveLayoutRequiresOwnedReadyRoom stores a layout only for the owner's finished room.
func TestSaveLayoutRequiresOwnedReadyRoom(t *testing.T) {
	svc, tours, _, _ := newTourFixture(t)
	ctx := context.Background()
	room := &models.TourRoom{PropertyID: 1, Name: "Kamar", Status: models.TourStatusProcessing}
	_ = tours.CreateRoom(ctx, room)
	layout := models.RoomLayout{CameraHeightCm: 150, FloorOutline: squareOutline()}
	if err := svc.SaveLayout(ctx, 1, room.ID, layout); err == nil {
		t.Fatal("expected processing room to be rejected")
	}
	tours.rooms[room.ID].Status = models.TourStatusReady
	if err := svc.SaveLayout(ctx, 2, room.ID, layout); err == nil {
		t.Fatal("expected another seller to be rejected")
	}
	if err := svc.SaveLayout(ctx, 1, room.ID, layout); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := tours.rooms[room.ID]; got.CameraHeightCm != 150 || len(got.FloorOutline) != 4 {
		t.Fatalf("layout not stored: %+v", got)
	}
}
