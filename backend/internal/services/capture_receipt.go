package services

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"regexp"
	"strings"
	"time"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

var captureUUID = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

// recordingDigest binds the request ID to the ordered JPEGs and their geometry across uploads and server restarts.
func recordingDigest(frames []CaptureFrame) []byte {
	hash := sha256.New()
	for _, frame := range frames {
		imageHash := sha256.Sum256(frame.Data)
		hash.Write(imageHash[:])
		if band := frame.Band; band != nil {
			hash.Write([]byte{1})
			_ = binary.Write(hash, binary.BigEndian, [3]float64{band.Pitch, band.MinPitch, band.MaxPitch})
		} else {
			hash.Write([]byte{0})
			_ = binary.Write(hash, binary.BigEndian, frame.Orientation)
		}
	}
	return hash.Sum(nil)
}

// acceptRecording returns a persisted receipt on replay and schedules only newly accepted recordings.
func (s *tourService) acceptRecording(ctx context.Context, ownerID int64, room *models.TourRoom, key string, frames []CaptureFrame) (*models.TourRoom, error) {
	key = strings.ToLower(key)
	if !captureUUID.MatchString(key) {
		return nil, newValidationError("ID rekaman panorama tidak valid.")
	}
	created, err := s.tours.AcceptCapture(ctx, ownerID, room, key, recordingDigest(frames), func(id int64) error {
		saveErr := storeCapture(s.storage, id, room.Name, frames)
		if saveErr != nil {
			_ = s.storage.RemoveAll(captureDir(id))
		}
		return saveErr
	})
	if created && err != nil {
		return s.resolveCaptureCommit(ctx, room.ID, err)
	}
	if errors.Is(err, repositories.ErrDuplicate) {
		return nil, newValidationError("ID rekaman sudah dipakai untuk gambar panorama yang berbeda.")
	}
	if errors.Is(err, repositories.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if !created {
		return room, nil
	}
	s.queue.Enqueue(room.ID)
	return s.reloadRoom(ctx, room), nil
}

// resolveCaptureCommit checks the primary database before discarding inputs when a commit acknowledgement is lost.
func (s *tourService) resolveCaptureCommit(ctx context.Context, id int64, commitErr error) (*models.TourRoom, error) {
	check, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	saved, err := s.tours.GetRoom(check, id)
	if errors.Is(err, repositories.ErrNotFound) {
		_ = s.storage.RemoveAll(captureDir(id))
		return nil, commitErr
	}
	if err != nil || saved.Status == models.TourStatusProcessing {
		s.queue.Enqueue(id)
	}
	if err != nil {
		return nil, commitErr
	}
	return saved, nil
}
