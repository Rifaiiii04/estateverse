package services

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"math"
	"testing"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/panorama"
)

// roomSceneFrames renders a complete textured sphere with known camera poses for a real stitching integration test.
func roomSceneFrames() []CaptureFrame {
	var frames []CaptureFrame
	for _, pitch := range []float64{0, 45, -45, 90, -90} {
		count := 12
		if pitch == 0 {
			count = 16
		}
		if math.Abs(pitch) == 90 {
			count = 1
		}
		for i := 0; i < count; i++ {
			yaw := float64(i) * 2 * math.Pi / float64(count)
			p := pitch * math.Pi / 180
			q := [4]float64{math.Cos(yaw/2) * math.Cos(p/2), math.Cos(yaw/2) * math.Sin(p/2),
				-math.Sin(yaw/2) * math.Cos(p/2), math.Sin(yaw/2) * math.Sin(p/2)}
			frames = append(frames, CaptureFrame{Data: roomSceneJPEG(panorama.EulerToMat(yaw, p, 0)), Orientation: q})
		}
	}
	return frames
}

// roomSceneJPEG projects a textured environment into one portrait camera image without random per-frame noise.
func roomSceneJPEG(rot panorama.Mat3) []byte {
	const w, h = 240, 400
	focal := float64(w) / 2 / math.Tan(48*math.Pi/360)
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			d := rot.MulVec(panorama.Vec3{X: (float64(x) + 0.5 - w/2) / focal,
				Y: -(float64(y) + 0.5 - h/2) / focal, Z: -1}).Norm()
			i := img.PixOffset(x, y)
			img.Pix[i] = uint8(128 + 60*math.Sin(23*d.X+5)*math.Cos(19*d.Y))
			img.Pix[i+1] = uint8(128 + 60*math.Cos(29*d.Y-7*d.Z))
			img.Pix[i+2] = uint8(128 + 60*math.Sin(17*d.Z+31*d.X))
			img.Pix[i+3] = 255
		}
	}
	var buf bytes.Buffer
	_ = jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85})
	return buf.Bytes()
}

// TestQueueRejectsUnrelatedFrames ensures a full camera sweep of unmatched photos is not published as a valid tour.
func TestQueueRejectsUnrelatedFrames(t *testing.T) {
	svc, tours, _, storage := newTourFixture(t)
	room, err := svc.StartCapture(context.Background(), 1, 1, "Kamar", testCaptureFrames(12, 320, 400), CaptureExtras{})
	if err != nil {
		t.Fatal(err)
	}
	NewTourQueue(tours, storage).(*tourQueue).process(context.Background(), room.ID)
	if got := tours.rooms[room.ID]; got.Status != models.TourStatusFailed || got.PanoramaPath != "" || got.ErrorMessage == "" {
		t.Fatalf("invalid capture was published: %+v", got)
	}
	if abs, _ := storage.GetAbsolutePath(captureDir(room.ID)); !dirExists(abs) {
		t.Fatal("failed capture should keep its private frames for diagnosis")
	}
}

// TestStitchFailureRecovery distinguishes a finished job's deadline from an interrupted worker eligible for recovery.
func TestStitchFailureRecovery(t *testing.T) {
	_, tours, _, storage := newTourFixture(t)
	room := &models.TourRoom{PropertyID: 1, Name: "Kamar", Status: models.TourStatusProcessing}
	if err := tours.CreateRoom(context.Background(), room); err != nil {
		t.Fatal(err)
	}
	q := NewTourQueue(tours, storage).(*tourQueue)
	shutdown, cancel := context.WithCancel(context.Background())
	cancel()
	q.recordStitchFailure(shutdown, room.ID, context.Canceled)
	if tours.rooms[room.ID].Status != models.TourStatusProcessing {
		t.Fatal("shutdown should preserve processing status for restart")
	}
	q.recordStitchFailure(context.Background(), room.ID, context.DeadlineExceeded)
	updated := tours.rooms[room.ID]
	if updated.Status != models.TourStatusFailed || updated.ErrorMessage != stitchFailureMessage(context.DeadlineExceeded) {
		t.Fatalf("stitch timeout should have a terminal status: %+v", updated)
	}
}
