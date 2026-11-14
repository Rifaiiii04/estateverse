package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"log/slog"
	"os"
	"path"
	"sync"
	"time"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/panorama"
	"projectfai/backend/internal/repositories"
)

const (
	panoramaJPEGQuality = 85
	stitchTimeout       = 5 * time.Minute
)

// TourQueue stitches captured rooms in the background, one at a time to bound CPU and memory use.
type TourQueue interface {
	Enqueue(roomID int64)
	Start(ctx context.Context)
}

type tourQueue struct {
	jobs      chan int64
	tours     repositories.TourRepository
	storage   StorageService
	startOnce sync.Once
}

// NewTourQueue creates the background stitching queue.
func NewTourQueue(tours repositories.TourRepository, storage StorageService) TourQueue {
	return &tourQueue{jobs: make(chan int64, 64), tours: tours, storage: storage}
}

// Enqueue schedules a room for stitching without blocking the request.
func (q *tourQueue) Enqueue(roomID int64) {
	select {
	case q.jobs <- roomID:
		slog.Info("tour stitching job enqueued", "room_id", roomID)
	default:
		slog.Warn("tour queue full, room will be retried on next restart", "room_id", roomID)
	}
}

// Start cleans up rooms of deleted properties, re-queues interrupted rooms, and launches the single worker.
func (q *tourQueue) Start(ctx context.Context) {
	q.startOnce.Do(func() {
		q.removeOrphans(ctx)
		if pending, err := q.tours.ListProcessing(ctx); err == nil {
			for _, room := range pending {
				q.Enqueue(room.ID)
			}
		}
		go q.workerLoop(ctx)
	})
}

// removeOrphans deletes rooms (and their files) whose property was deleted.
func (q *tourQueue) removeOrphans(ctx context.Context) {
	rooms, err := q.tours.DeleteOrphanRooms(ctx)
	if err != nil {
		slog.Warn("tour orphan cleanup failed", "error", err)
		return
	}
	for i := range rooms {
		removeRoomFiles(q.storage, &rooms[i])
	}
}

// workerLoop processes rooms until the context is cancelled.
func (q *tourQueue) workerLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case roomID := <-q.jobs:
			q.process(ctx, roomID)
		}
	}
}

// process stitches one room and records either the finished panorama or a seller-friendly failure.
func (q *tourQueue) process(ctx context.Context, roomID int64) {
	start := time.Now()
	jobCtx, cancel := context.WithTimeout(ctx, stitchTimeout)
	defer cancel()

	result, err := q.stitchRoom(roomID)
	if err == nil {
		err = q.savePanorama(jobCtx, roomID, result)
	}
	if err != nil {
		slog.Error("tour stitching failed", "room_id", roomID, "error", err)
		_ = q.tours.MarkFailed(jobCtx, roomID, stitchFailureMessage(err))
		return
	}
	_ = q.storage.RemoveAll(captureDir(roomID))
	slog.Info("tour room stitched", "room_id", roomID, "fov", result.FOV, "quality", result.Quality,
		"coverage", result.Coverage, "duration", time.Since(start).Round(time.Millisecond))
}

// stitchRoom loads the stored frames and manifest of a room and runs the panorama pipeline.
func (q *tourQueue) stitchRoom(roomID int64) (*panorama.Result, error) {
	manifest, err := q.readManifest(roomID)
	if err != nil {
		return nil, err
	}
	inputs := make([]panorama.FrameInput, 0, len(manifest.Frames))
	for _, meta := range manifest.Frames {
		img, err := q.decodeFrame(roomID, meta.Index)
		if err != nil {
			return nil, err
		}
		inputs = append(inputs, panorama.FrameInput{Image: img, Orientation: meta.Orientation})
	}
	return panorama.Stitch(inputs, panorama.DefaultOptions())
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

// savePanorama encodes full and preview JPEGs, stores them publicly, and marks the room ready.
func (q *tourQueue) savePanorama(ctx context.Context, roomID int64, res *panorama.Result) error {
	mainPath, err := writePanoramaJPEG(q.storage, res.Panorama)
	if err != nil {
		return err
	}
	previewPath, err := writePanoramaJPEG(q.storage, panorama.Downsample2(res.Panorama))
	if err != nil {
		return err
	}
	return q.tours.MarkReady(ctx, roomID, mainPath, previewPath, res.Quality)
}

// writePanoramaJPEG encodes an image as JPEG into the panoramas folder and returns its public URL path.
func writePanoramaJPEG(storage StorageService, img image.Image) (string, error) {
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: panoramaJPEGQuality}); err != nil {
		return "", err
	}
	name, err := generateUniqueFilename(".jpg")
	if err != nil {
		return "", err
	}
	rel := path.Join(CategoryPanoramas, name)
	if err := storage.WriteFile(rel, buf.Bytes()); err != nil {
		return "", err
	}
	return "/api/v1/storage/" + rel, nil
}

// stitchFailureMessage converts pipeline errors into Indonesian guidance for the seller.
func stitchFailureMessage(err error) string {
	switch {
	case errors.Is(err, panorama.ErrTooFewFrames):
		return "Foto terlalu sedikit untuk membuat panorama 360°. Silakan rekam ulang ruangan ini."
	case errors.Is(err, panorama.ErrMixedSizes):
		return "Ukuran foto berubah saat merekam. Rekam ulang tanpa memutar layar ke mode landscape."
	default:
		return "Panorama gagal diproses. Silakan rekam ulang ruangan ini."
	}
}
