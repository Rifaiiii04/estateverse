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
	tourQueueCapacity   = 256
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
	activity  ActivityService
	startOnce sync.Once
}

// NewTourQueue creates the background stitching queue.
func NewTourQueue(tours repositories.TourRepository, storage StorageService, activity ...ActivityService) TourQueue {
	var activitySvc ActivityService
	if len(activity) > 0 {
		activitySvc = activity[0]
	}
	return &tourQueue{jobs: make(chan int64, tourQueueCapacity), tours: tours, storage: storage, activity: activitySvc}
}

// Enqueue schedules a room for stitching on the bounded background queue.
func (q *tourQueue) Enqueue(roomID int64) {
	q.jobs <- roomID
	slog.Info("tour stitching job enqueued", "room_id", roomID)
	q.recordActivity(context.Background(), "tour.stitch.enqueued", "success", roomID, "Tour stitching job queued", "")
}

// Start cleans up rooms of deleted properties, re-queues interrupted rooms, and launches the single worker.
func (q *tourQueue) Start(ctx context.Context) {
	q.startOnce.Do(func() {
		go q.workerLoop(ctx)
		q.removeOrphans(ctx)
		if pending, err := q.tours.ListProcessing(ctx); err == nil {
			for _, room := range pending {
				q.Enqueue(room.ID)
				q.recordActivity(ctx, "tour.stitch.recovered", "success", room.ID, "Interrupted tour stitching job recovered", "")
			}
		} else {
			slog.Error("tour recovery scan failed", "error", err)
			q.recordActivity(ctx, "tour.stitch.recovery_failed", "error", 0, "Interrupted tour jobs could not be recovered", err.Error())
		}
	})
}

// removeOrphans deletes rooms (and their files) whose property was deleted.
func (q *tourQueue) removeOrphans(ctx context.Context) {
	rooms, err := q.tours.DeleteOrphanRooms(ctx)
	if err != nil {
		slog.Warn("tour orphan cleanup failed", "error", err)
		q.recordActivity(ctx, "tour.orphan_cleanup.failed", "error", 0, "Orphan tour cleanup failed", err.Error())
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
		q.recordActivity(jobCtx, "tour.stitch.failed", "error", roomID, "Tour panorama processing failed", err.Error())
		_ = q.tours.MarkFailed(jobCtx, roomID, stitchFailureMessage(err))
		return
	}
	_ = q.storage.RemoveAll(captureDir(roomID))
	slog.Info("tour room stitched", "room_id", roomID, "fov", result.FOV, "quality", result.Quality,
		"coverage", result.Coverage, "duration", time.Since(start).Round(time.Millisecond))
	q.recordActivity(jobCtx, "tour.stitch.completed", "success", roomID, "Tour panorama processing completed", fmt.Sprintf("quality=%d coverage=%.3f", result.Quality, result.Coverage))
}

// recordActivity stores a background tour event when activity history is configured.
func (q *tourQueue) recordActivity(ctx context.Context, action, status string, roomID int64, message, details string) {
	if q.activity == nil {
		return
	}
	q.activity.Record(ctx, models.ActivityLogInput{
		Action:       action,
		Status:       status,
		ResourceType: "tour_room",
		ResourceID:   roomID,
		Message:      message,
		Details:      details,
	})
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
	case errors.Is(err, panorama.ErrIncompleteCoverage):
		return "Ada sudut ruangan yang belum terfoto. Rekam ulang mengikuti semua titik yang dihitung, jaga posisi lensa, dan tahan HP sampai foto terambil."
	case errors.Is(err, panorama.ErrUnreliableAlignment):
		return "Sambungan foto belum cocok. Nyalakan lampu, tahan HP hingga foto diambil, dan putar pada posisi lensa yang sama tanpa berjalan."
	default:
		return "Panorama gagal diproses. Silakan rekam ulang ruangan ini."
	}
}
