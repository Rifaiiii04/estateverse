package services

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/draw"
	_ "image/png" // registers PNG decoding for imported panoramas
	"math"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/panorama"
	"projectfai/backend/internal/repositories"
)

const (
	maxImportBytes    = 40 << 20
	maxImportPixels   = 60_000_000
	maxPanoramaWidth  = 4096
	minImportWidth    = 1024
	equirectTolerance = 0.03
)

// ImportPanorama stores a ready-made equirectangular 360° photo (from a 360 camera or Photo Sphere) as a room.
func (s *tourService) ImportPanorama(ctx context.Context, ownerID, propertyID int64, name string,
	data []byte) (*models.TourRoom, error) {
	cleanName, err := s.prepareRoom(ctx, ownerID, propertyID, name)
	if err != nil {
		return nil, err
	}
	img, err := decodeEquirect(data)
	if err != nil {
		return nil, err
	}
	main := shrinkToWidth(toRGBA(img), maxPanoramaWidth)
	mainPath, err := writePanoramaJPEG(s.storage, main)
	if err != nil {
		return nil, err
	}
	previewPath, err := writePanoramaJPEG(s.storage, panorama.Downsample2(main))
	if err != nil {
		return nil, err
	}
	room := &models.TourRoom{PropertyID: propertyID, Name: cleanName, Source: models.TourSourceImport,
		Status: models.TourStatusReady, PanoramaPath: mainPath, PreviewPath: previewPath, QualityScore: 100,
		Hotspots: []models.TourHotspot{}}
	if err := s.tours.CreateRoom(ctx, room); err != nil {
		return nil, err
	}
	return s.reloadRoom(ctx, room), nil
}

// AddHotspot links two rooms of the same owned property with a marker at the given direction.
func (s *tourService) AddHotspot(ctx context.Context, ownerID int64, h models.TourHotspot) (*models.TourHotspot, error) {
	if h.FromRoomID == h.ToRoomID || !validHotspotAngles(h.Yaw, h.Pitch) {
		return nil, newValidationError("hotspot tidak valid")
	}
	from, err := s.GetOwnerRoom(ctx, ownerID, h.FromRoomID)
	if err != nil {
		return nil, err
	}
	to, err := s.GetOwnerRoom(ctx, ownerID, h.ToRoomID)
	if err != nil {
		return nil, err
	}
	if from.PropertyID != to.PropertyID {
		return nil, newValidationError("kedua ruangan harus berasal dari properti yang sama")
	}
	return &h, s.tours.AddHotspot(ctx, &h)
}

// DeleteHotspot removes a marker after confirming the seller owns its room.
func (s *tourService) DeleteHotspot(ctx context.Context, ownerID, hotspotID int64) error {
	h, err := s.tours.GetHotspot(ctx, hotspotID)
	if errors.Is(err, repositories.ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if _, err := s.GetOwnerRoom(ctx, ownerID, h.FromRoomID); err != nil {
		return err
	}
	return s.tours.DeleteHotspot(ctx, hotspotID)
}

// decodeEquirect validates size and 2:1 aspect ratio before fully decoding an imported panorama.
func decodeEquirect(data []byte) (image.Image, error) {
	if len(data) == 0 || len(data) > maxImportBytes {
		return nil, newValidationError("ukuran file panorama maksimal 40 MB")
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, newValidationError("file harus berupa foto JPEG atau PNG")
	}
	ratio := float64(cfg.Width) / float64(cfg.Height)
	if cfg.Width < minImportWidth || cfg.Width*cfg.Height > maxImportPixels || math.Abs(ratio-2) > 2*equirectTolerance {
		return nil, newValidationError("foto 360 harus berformat equirectangular 2:1 (contoh 4096×2048)")
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, newValidationError("foto panorama tidak dapat dibaca")
	}
	return img, nil
}

// toRGBA copies any image into an RGBA buffer anchored at the origin.
func toRGBA(img image.Image) *image.RGBA {
	b := img.Bounds()
	out := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	draw.Draw(out, out.Bounds(), img, b.Min, draw.Src)
	return out
}

// shrinkToWidth halves an image until it fits within maxWidth so phones can load it as one texture.
func shrinkToWidth(img *image.RGBA, maxWidth int) *image.RGBA {
	for img.Rect.Dx() > maxWidth {
		img = panorama.Downsample2(img)
	}
	return img
}
