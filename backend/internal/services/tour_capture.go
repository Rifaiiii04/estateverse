package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg" // registers the JPEG decoder for capture frames
	"math"
	"path"
	"strings"
	"unicode/utf8"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/panorama"
)

const (
	maxCaptureFrames    = 48
	maxFrameBytes       = 3 << 20
	minFrameSide        = 240
	maxFrameSide        = 2560
	maxRoomNameRunes    = 40
	maxRoomNoteRunes    = 160
	captureManifestName = "manifest.json"
)

// CaptureFrame is one auto-captured JPEG with the device orientation quaternion (w, x, y, z).
type CaptureFrame struct {
	Data        []byte
	Orientation [4]float64
}

// validateRoomName trims a room name and enforces a readable length.
func validateRoomName(name string) (string, error) {
	clean := strings.Join(strings.Fields(name), " ")
	n := utf8.RuneCountInString(clean)
	if n < 1 || n > maxRoomNameRunes {
		return "", newValidationError(fmt.Sprintf("nama ruangan wajib diisi (1-%d karakter)", maxRoomNameRunes))
	}
	return clean, nil
}

// validateRoomNote trims an optional room note (e.g. size and window direction) and caps its length.
func validateRoomNote(note string) (string, error) {
	clean := strings.Join(strings.Fields(note), " ")
	if utf8.RuneCountInString(clean) > maxRoomNoteRunes {
		return "", newValidationError(fmt.Sprintf("catatan ruangan maksimal %d karakter", maxRoomNoteRunes))
	}
	return clean, nil
}

// validateCaptureFrames checks frame count, JPEG content, consistent dimensions, and sane orientations.
func validateCaptureFrames(frames []CaptureFrame) error {
	if len(frames) < panorama.MinFrames || len(frames) > maxCaptureFrames {
		return newValidationError(fmt.Sprintf("jumlah foto harus %d-%d", panorama.MinFrames, maxCaptureFrames))
	}
	var first image.Config
	for i, f := range frames {
		cfg, err := inspectFrame(f)
		if err != nil {
			return newValidationError(fmt.Sprintf("foto ke-%d tidak valid: %v", i+1, err))
		}
		if i == 0 {
			first = cfg
		}
		if cfg.Width != first.Width || cfg.Height != first.Height {
			return newValidationError("semua foto dalam satu rekaman harus berukuran sama")
		}
	}
	return nil
}

// inspectFrame validates one frame's size, JPEG header, dimensions, and quaternion length.
func inspectFrame(f CaptureFrame) (image.Config, error) {
	if len(f.Data) == 0 || len(f.Data) > maxFrameBytes {
		return image.Config{}, fmt.Errorf("ukuran file harus di bawah %d MB", maxFrameBytes>>20)
	}
	cfg, format, err := image.DecodeConfig(bytes.NewReader(f.Data))
	if err != nil || format != "jpeg" {
		return image.Config{}, fmt.Errorf("bukan JPEG yang valid")
	}
	if cfg.Width < minFrameSide || cfg.Height < minFrameSide || cfg.Width > maxFrameSide || cfg.Height > maxFrameSide {
		return image.Config{}, fmt.Errorf("resolusi di luar batas %d-%d px", minFrameSide, maxFrameSide)
	}
	q := f.Orientation
	norm := math.Sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3])
	if math.IsNaN(norm) || norm < 0.9 || norm > 1.1 {
		return image.Config{}, fmt.Errorf("data sensor orientasi tidak valid")
	}
	return cfg, nil
}

// captureDir is the private storage folder holding one room's raw frames until stitching finishes.
func captureDir(roomID int64) string {
	return path.Join(CategoryTourFrames, fmt.Sprintf("%d", roomID))
}

// frameFileName names the i-th frame inside a capture folder.
func frameFileName(i int) string {
	return fmt.Sprintf("%02d.jpg", i)
}

// storeCapture writes frames and a manifest of orientations into the room's private capture folder.
func storeCapture(storage StorageService, roomID int64, name string, frames []CaptureFrame) error {
	manifest := models.CaptureMeta{Name: name}
	for i, f := range frames {
		if err := storage.WriteFile(path.Join(captureDir(roomID), frameFileName(i)), f.Data); err != nil {
			return err
		}
		manifest.Frames = append(manifest.Frames, models.CaptureFrameMeta{Index: i, Orientation: f.Orientation})
	}
	data, err := json.Marshal(manifest)
	if err != nil {
		return err
	}
	return storage.WriteFile(path.Join(captureDir(roomID), captureManifestName), data)
}
