package services

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/jpeg"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/panorama"
)

// MaxBandBytes bounds a complete panoramic strip independently from a single phone photo.
const MaxBandBytes = 16 << 20

// validateCaptureBands inspects every JPEG header and checks the sphere layout before any room is created.
func validateCaptureBands(frames []CaptureFrame) error {
	if len(frames) < 3 || len(frames) > 5 {
		return newValidationError("dibutuhkan 3–5 pita panorama")
	}
	layout := make([]panorama.BandGeometry, len(frames))
	for i, frame := range frames {
		if frame.Band == nil || frame.Band.Index != i || len(frame.Data) > MaxBandBytes {
			return newValidationError("data pita panorama tidak valid")
		}
		cfg, err := jpeg.DecodeConfig(bytes.NewReader(frame.Data))
		if err != nil {
			return newValidationError(fmt.Sprintf("pita %d harus berupa JPEG yang valid", i+1))
		}
		layout[i] = bandGeometry(*frame.Band, image.Pt(cfg.Width, cfg.Height))
	}
	if err := panorama.ValidateBandLayout(layout); err != nil {
		return newValidationError("cakupan pita panorama tidak lengkap: " + err.Error())
	}
	return nil
}

// bandGeometry combines the observed pixel dimensions with the strip's world-space latitude bounds.
func bandGeometry(meta models.CaptureBandMeta, size image.Point) panorama.BandGeometry {
	return panorama.BandGeometry{Width: size.X, Height: size.Y, Pitch: meta.Pitch, MinPitch: meta.MinPitch, MaxPitch: meta.MaxPitch}
}

// stitchBands decodes only the stored full-width strips before passing them to the dedicated compositor.
func (q *tourQueue) stitchBands(ctx context.Context, roomID int64, bands []models.CaptureBandMeta) (*panorama.Result, error) {
	inputs := make([]panorama.BandInput, len(bands))
	for i, meta := range bands {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		img, err := q.decodeFrame(roomID, meta.Index)
		if err != nil {
			return nil, err
		}
		inputs[i] = panorama.BandInput{Geometry: bandGeometry(meta, img.Bounds().Size()), Image: img}
	}
	return panorama.StitchBands(ctx, inputs)
}
