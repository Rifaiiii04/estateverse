package services

import (
	"context"
	"fmt"
	"math"

	"projectfai/backend/internal/models"
)

const (
	minCameraHeightCm = 50
	maxCameraHeightCm = 250
	minOutlinePoints  = 3
	maxOutlinePoints  = 24
	maxFloorPitchDeg  = -2.0
	minFloorPitchDeg  = -89.9
)

// SaveLayout stores the camera height and floor outline a seller traced for one owned, ready room.
func (s *tourService) SaveLayout(ctx context.Context, ownerID, roomID int64, layout models.RoomLayout) error {
	if err := validateLayout(layout); err != nil {
		return err
	}
	room, err := s.GetOwnerRoom(ctx, ownerID, roomID)
	if err != nil {
		return err
	}
	if room.Status != models.TourStatusReady {
		return newValidationError("ukuran hanya bisa diatur setelah panorama selesai diproses")
	}
	return s.tours.SaveLayout(ctx, roomID, layout)
}

// validateLayout checks the camera height and that every outline corner lies on the floor below the horizon.
func validateLayout(layout models.RoomLayout) error {
	if err := validateCameraHeight(layout.CameraHeightCm, true); err != nil {
		return err
	}
	n := len(layout.FloorOutline)
	if n != 0 && (n < minOutlinePoints || n > maxOutlinePoints) {
		return newValidationError(fmt.Sprintf("denah ruangan harus %d-%d titik sudut", minOutlinePoints, maxOutlinePoints))
	}
	for _, p := range layout.FloorOutline {
		if !validFloorPoint(p) {
			return newValidationError("setiap titik sudut harus berada di lantai (di bawah garis horizon)")
		}
	}
	return nil
}

// validateCameraHeight enforces a plausible phone height above the floor; zero means "not measured" when allowed.
func validateCameraHeight(cm int, required bool) error {
	if cm == 0 && !required {
		return nil
	}
	if cm < minCameraHeightCm || cm > maxCameraHeightCm {
		return newValidationError(fmt.Sprintf("tinggi HP dari lantai harus %d-%d cm", minCameraHeightCm, maxCameraHeightCm))
	}
	return nil
}

// validFloorPoint reports whether a traced corner has finite angles pointing below the horizon.
func validFloorPoint(p models.FloorPoint) bool {
	if math.IsNaN(p.Yaw) || math.IsInf(p.Yaw, 0) || math.IsNaN(p.Pitch) || math.IsInf(p.Pitch, 0) {
		return false
	}
	return p.Yaw >= -360 && p.Yaw <= 360 && p.Pitch >= minFloorPitchDeg && p.Pitch <= maxFloorPitchDeg
}
