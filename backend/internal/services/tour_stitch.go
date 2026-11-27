package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"log/slog"
	"os"
	"path"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/panorama"
)

// stitchRoom loads a room's frames and manifest, stitches them with Hugin when it is installed, and falls back
// to the built-in Go pipeline when Hugin is missing or cannot produce a reliable panorama.
func (q *tourQueue) stitchRoom(ctx context.Context, roomID int64) (*panorama.Result, error) {
	manifest, err := q.readManifest(roomID)
	if err != nil {
		return nil, err
	}
	if len(manifest.Bands) > 0 {
		return q.stitchBands(ctx, roomID, manifest.Bands)
	}
	inputs := make([]panorama.FrameInput, 0, len(manifest.Frames))
	for _, meta := range manifest.Frames {
		img, err := q.decodeFrame(roomID, meta.Index)
		if err != nil {
			return nil, err
		}
		inputs = append(inputs, panorama.FrameInput{Image: img, Orientation: meta.Orientation})
	}
	if panorama.HuginAvailable() {
		res, err := q.stitchWithHugin(ctx, roomID, manifest, inputs)
		if err == nil || ctx.Err() != nil {
			return res, err
		}
		slog.Warn("hugin stitching failed, using built-in stitcher", "room_id", roomID, "error", err)
		q.recordActivity(ctx, "tour.stitch.hugin_failed", "error", roomID, "Hugin stitching failed; built-in stitcher used", err.Error())
	}
	return panorama.Stitch(inputs, panorama.DefaultOptions())
}

// stitchWithHugin hands the stored JPEG files and their orientations to Hugin, seeding the lens with a quick
// overlap-based estimate that Hugin then refines from matched features.
func (q *tourQueue) stitchWithHugin(ctx context.Context, roomID int64, manifest *models.CaptureMeta, inputs []panorama.FrameInput) (*panorama.Result, error) {
	frames := make([]panorama.HuginFrame, 0, len(manifest.Frames))
	for _, meta := range manifest.Frames {
		abs, err := q.storage.GetAbsolutePath(path.Join(captureDir(roomID), frameFileName(meta.Index)))
		if err != nil {
			return nil, err
		}
		frames = append(frames, panorama.HuginFrame{Path: abs, Orientation: meta.Orientation})
	}
	opts := panorama.DefaultOptions()
	fov := panorama.EstimateFOV(inputs, opts.FallbackFOV)
	return panorama.StitchHugin(ctx, frames, opts.OutputWidth, fov)
}

// readManifest parses the capture manifest written when the frames were uploaded.
func (q *tourQueue) readManifest(roomID int64) (*models.CaptureMeta, error) {
	abs, err := q.storage.GetAbsolutePath(path.Join(captureDir(roomID), captureManifestName))
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return nil, fmt.Errorf("capture manifest missing: %w", err)
	}
	var manifest models.CaptureMeta
	return &manifest, json.Unmarshal(data, &manifest)
}

// decodeFrame reads and decodes one stored JPEG frame.
func (q *tourQueue) decodeFrame(roomID int64, index int) (image.Image, error) {
	abs, err := q.storage.GetAbsolutePath(path.Join(captureDir(roomID), frameFileName(index)))
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return nil, err
	}
	return jpeg.Decode(bytes.NewReader(data))
}
