package services

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/jpeg"
	"math"
	"os"
	"strings"
	"testing"

	"projectfai/backend/internal/models"
)

// testRoomBands builds a fully covered three-pass JPEG upload with textured overlaps.
func testRoomBands(t *testing.T) []CaptureFrame {
	t.Helper()
	var frames []CaptureFrame
	for i, b := range [][3]float64{{0, -34, 34}, {60, 26, 90}, {-60, -90, -26}} {
		const w = 1024
		top := int(math.Round((90 - b[2]) * w / 360))
		h := int(math.Round((90-b[1])*w/360)) - top
		img := image.NewGray(image.Rect(0, 0, w, h))
		for y := 0; y < h; y++ {
			for x := 0; x < w; x++ {
				img.Pix[y*w+x] = uint8(128 + 80*math.Sin(float64(x+y+top)*0.17))
			}
		}
		var data bytes.Buffer
		if err := jpeg.Encode(&data, img, nil); err != nil {
			t.Fatal(err)
		}
		frames = append(frames, CaptureFrame{Data: data.Bytes(), Band: &models.CaptureBandMeta{Index: i, Pitch: b[0], MinPitch: b[1], MaxPitch: b[2]}})
	}
	return frames
}

// TestBandUploadThroughWorker verifies ownership, persisted recovery data, genuine stitch, preview, and ready-room delivery.
func TestBandUploadThroughWorker(t *testing.T) {
	ctx := context.Background()
	svc, tours, queue, storage := newTourFixture(t)
	frames := testRoomBands(t)
	if _, err := svc.StartCapture(ctx, 2, 1, "Kamar", frames, CaptureExtras{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign capture accepted: %v", err)
	}
	room, err := svc.StartCapture(ctx, 1, 1, "Kamar", frames, CaptureExtras{})
	if err != nil || len(queue.ids) != 1 {
		t.Fatalf("band upload failed: %v", err)
	}
	worker := NewTourQueue(tours, storage).(*tourQueue)
	manifest, err := worker.readManifest(room.ID)
	if err != nil || len(manifest.Bands) != 3 || len(manifest.Frames) != 0 {
		t.Fatalf("stored band manifest invalid: %v", err)
	}
	worker.process(ctx, room.ID)
	// Simulate redelivery after recovery already completed the same room.
	worker.process(ctx, room.ID)
	done := tours.rooms[room.ID]
	if done.Status != models.TourStatusReady || done.PreviewPath == "" {
		t.Fatalf("room not ready: %+v", done)
	}
	for url, width := range map[string]int{done.PanoramaPath: 1024, done.PreviewPath: 512} {
		name, _ := storage.GetAbsolutePath(strings.TrimPrefix(url, "/api/v1/storage/"))
		data, err := os.ReadFile(name)
		if err != nil {
			t.Fatal(err)
		}
		cfg, err := jpeg.DecodeConfig(bytes.NewReader(data))
		if err != nil || cfg.Width != width || cfg.Height != width/2 {
			t.Fatalf("unexpected ready texture %v: %v", cfg, err)
		}
	}
}
