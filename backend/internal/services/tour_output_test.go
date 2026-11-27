package services

import (
	"context"
	"errors"
	"image"
	"os"
	"strings"
	"testing"
	"time"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/panorama"
	"projectfai/backend/internal/repositories"
)

type previewFailureStorage struct {
	StorageService
	writes int
}

// WriteFile simulates a failed preview after the full panorama successfully reached disk.
func (s *previewFailureStorage) WriteFile(name string, data []byte) error {
	s.writes++
	if s.writes == 2 {
		if err := s.StorageService.WriteFile(name, data[:len(data)/2]); err != nil {
			return err
		}
		return errors.New("preview write failed")
	}
	return s.StorageService.WriteFile(name, data)
}

// TestDeletedRoomCannotPublishPanorama verifies that deletion wins even after a worker has completed rendering.
func TestDeletedRoomCannotPublishPanorama(t *testing.T) {
	_, repo, _, storage := newTourFixture(t)
	q := NewTourQueue(repo, storage).(*tourQueue)
	res := &panorama.Result{Panorama: image.NewRGBA(image.Rect(0, 0, 256, 128))}
	if err := q.savePanorama(context.Background(), 77, res); !errors.Is(err, repositories.ErrTourNotProcessing) {
		t.Fatalf("expected stale job result, got %v", err)
	}
	assertNoPublicPanoramas(t, storage)
}

// TestFailedPreviewLeavesNoPublicPanorama checks the cleanup of a partially saved JPEG pair.
func TestFailedPreviewLeavesNoPublicPanorama(t *testing.T) {
	_, repo, _, storage := newTourFixture(t)
	q := NewTourQueue(repo, &previewFailureStorage{StorageService: storage}).(*tourQueue)
	res := &panorama.Result{Panorama: image.NewRGBA(image.Rect(0, 0, 256, 128))}
	if err := q.savePanorama(context.Background(), 1, res); err == nil {
		t.Fatal("expected preview failure")
	}
	assertNoPublicPanoramas(t, storage)
}

type readyDuringDeletion struct{ *mockTourRepo }

// GetRoom publishes a completed stitch directly after the seller's ownership read to reproduce a late commit.
func (repo *readyDuringDeletion) GetRoom(ctx context.Context, id int64) (*models.TourRoom, error) {
	stale, err := repo.mockTourRepo.GetRoom(ctx, id)
	if err == nil {
		_ = repo.MarkReady(ctx, id, "/api/v1/storage/panoramas/full.jpg", "/api/v1/storage/panoramas/preview.jpg", 90)
	}
	return stale, err
}

// TestDeleteRoomDuringStitch removes files written after ownership validation and before deletion.
func TestDeleteRoomDuringStitch(t *testing.T) {
	svc, repo, _, storage := newTourFixture(t)
	ctx := context.Background()
	room := &models.TourRoom{PropertyID: 1, Status: models.TourStatusProcessing}
	if err := repo.CreateRoom(ctx, room); err != nil {
		t.Fatal(err)
	}
	svc.tours = &readyDuringDeletion{repo}
	for _, name := range []string{"full.jpg", "preview.jpg"} {
		if err := storage.WriteFile("panoramas/"+name, []byte(name)); err != nil {
			t.Fatal(err)
		}
	}
	if err := svc.DeleteRoom(ctx, 1, room.ID); err != nil {
		t.Fatal(err)
	}
	assertNoPublicPanoramas(t, storage)
}

// assertNoPublicPanoramas verifies no unused media for the test room remains in the served folder.
func assertNoPublicPanoramas(t *testing.T, storage StorageService) {
	t.Helper()
	dir, err := storage.GetAbsolutePath(CategoryPanoramas)
	if err != nil {
		t.Fatal(err)
	}
	files, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".jpg") {
			t.Errorf("orphaned panorama %s", file.Name())
		}
	}
}

type unavailableRoomStatus struct{ *mockTourRepo }

// GetRoom simulates an unavailable database before the worker can confirm the state of a queued room.
func (r *unavailableRoomStatus) GetRoom(context.Context, int64) (*models.TourRoom, error) {
	return nil, errors.New("database unavailable")
}

// TestRoomLookupRetry keeps a room recoverable and requeues it when its status cannot be confirmed.
func TestRoomLookupRetry(t *testing.T) {
	_, repo, _, storage := newTourFixture(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	room := &models.TourRoom{PropertyID: 1, Status: models.TourStatusProcessing}
	if err := repo.CreateRoom(ctx, room); err != nil {
		t.Fatal(err)
	}
	q := NewTourQueue(&unavailableRoomStatus{repo}, storage).(*tourQueue)
	q.process(ctx, room.ID)
	if repo.rooms[room.ID].Status != models.TourStatusProcessing {
		t.Fatal("status lookup failure consumed the room")
	}
	select {
	case id := <-q.jobs:
		if id != room.ID {
			t.Fatalf("wrong retry %d", id)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("processing room was not requeued")
	}
}
