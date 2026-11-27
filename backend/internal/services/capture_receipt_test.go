package services

import (
	"bytes"
	"context"
	"errors"
	"os"
	"path"
	"testing"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

type recordingKey struct {
	property int64
	id       string
}

type testReceipt struct {
	id     int64
	digest []byte
}

// AcceptCapture models persistent receipts for service tests that recreate the service or discard responses.
func (m *mockTourRepo) AcceptCapture(ctx context.Context, _ int64, room *models.TourRoom, key string, digest []byte, store func(int64) error) (bool, error) {
	if m.receipts == nil {
		m.receipts = make(map[recordingKey]testReceipt)
	}
	k := recordingKey{room.PropertyID, key}
	if receipt, ok := m.receipts[k]; ok && m.rooms[receipt.id] != nil {
		if !bytes.Equal(receipt.digest, digest) {
			return false, repositories.ErrDuplicate
		}
		*room = *m.rooms[receipt.id]
		return false, nil
	}
	if err := m.CreateRoom(ctx, room); err != nil {
		return false, err
	}
	if err := store(room.ID); err != nil {
		delete(m.rooms, room.ID)
		return false, err
	}
	m.receipts[k] = testReceipt{room.ID, digest}
	return true, nil
}

// TestRecordingReplayAfterLostResponse exercises repeated uploads after the first worker has deleted its private inputs.
func TestRecordingReplayAfterLostResponse(t *testing.T) {
	svc, repo, queue, storage := newTourFixture(t)
	ctx := context.Background()
	frames := testRoomBands(t)
	extras := CaptureExtras{CaptureID: "f47dc944-a7b2-4dcb-8eeb-27d286b51526"}
	first, err := svc.StartCapture(ctx, 1, 1, "Ruang tamu", frames, extras)
	if err != nil {
		t.Fatal(err)
	}
	NewTourQueue(repo, storage).(*tourQueue).process(ctx, first.ID)
	restarted := NewTourService(repo, svc.props, storage, queue)
	same, err := restarted.StartCapture(ctx, 1, 1, "Nama saat dicoba ulang", frames, extras)
	if err != nil || same.ID != first.ID || same.Name != first.Name || same.Status != models.TourStatusReady {
		t.Fatalf("replay lost the original room: %+v, %v", same, err)
	}
	if _, err = restarted.StartCapture(ctx, 2, 1, first.Name, frames, extras); !errors.Is(err, ErrNotFound) {
		t.Fatalf("unexpected foreign replay: %v", err)
	}
	if len(repo.rooms) != 1 || len(queue.ids) != 1 {
		t.Fatalf("replay duplicated either the room or the job: %d / %v", len(repo.rooms), queue.ids)
	}
	frames[0].Data = append(frames[0].Data, 0)
	if _, err = restarted.StartCapture(ctx, 1, 1, first.Name, frames, extras); err == nil {
		t.Fatal("recording ID reused for different bytes")
	}
	if _, err = restarted.StartCapture(ctx, 1, 3, first.Name, frames, extras); err != nil {
		t.Fatalf("IDs must be scoped to the destination property: %v", err)
	}
	extras.CaptureID = "invalid"
	if _, err = restarted.StartCapture(ctx, 1, 1, first.Name, frames, extras); err == nil {
		t.Fatal("accepted an invalid recording ID")
	}
}

type droppedCommitReply struct{ *mockTourRepo }

// AcceptCapture persists the room then simulates a lost MySQL commit acknowledgement.
func (r droppedCommitReply) AcceptCapture(ctx context.Context, ownerID int64, room *models.TourRoom, key string, digest []byte, store func(int64) error) (bool, error) {
	created, err := r.mockTourRepo.AcceptCapture(ctx, ownerID, room, key, digest, store)
	if created && err == nil {
		return true, errors.New("commit acknowledgement lost")
	}
	return created, err
}

// TestLostCommitReplyPreservesInputs verifies that uncertain commit status cannot erase a successfully stored panorama.
func TestLostCommitReplyPreservesInputs(t *testing.T) {
	svc, repo, queue, storage := newTourFixture(t)
	svc.tours = droppedCommitReply{repo}
	extras := CaptureExtras{CaptureID: "b96e0520-010c-4253-8dfe-fdb078716e5a"}
	room, err := svc.StartCapture(context.Background(), 1, 1, "Kamar", testRoomBands(t), extras)
	if err != nil || room == nil || len(queue.ids) != 1 {
		t.Fatalf("lost commit reply interrupted processing: %+v, %v", room, err)
	}
	manifest, _ := storage.GetAbsolutePath(path.Join(captureDir(room.ID), captureManifestName))
	if _, err := os.Stat(manifest); err != nil {
		t.Fatalf("removed the accepted input files: %v", err)
	}
}

type failedCaptureManifest struct{ StorageService }

// WriteFile simulates the disk filling after the JPEGs have been saved but before the manifest is complete.
func (s failedCaptureManifest) WriteFile(name string, data []byte) error {
	if path.Base(name) == captureManifestName {
		return errors.New("manifest write failed")
	}
	return s.StorageService.WriteFile(name, data)
}

// TestCaptureWriteFailureCanRetry verifies that a rejected upload releases its receipt and removes partial inputs.
func TestCaptureWriteFailureCanRetry(t *testing.T) {
	svc, repo, queue, storage := newTourFixture(t)
	svc.storage = failedCaptureManifest{storage}
	extras := CaptureExtras{CaptureID: "01b08116-bc69-481f-b7fa-2a8207005a1e"}
	frames := testRoomBands(t)
	_, err := svc.StartCapture(context.Background(), 1, 1, "Kamar", frames, extras)
	if err == nil || len(repo.rooms) != 0 || len(queue.ids) != 0 {
		t.Fatal("an unfinished upload was accepted")
	}
	folder, _ := storage.GetAbsolutePath(captureDir(repo.nextID))
	if _, err := os.Stat(folder); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("partial upload was retained: %v", err)
	}
	svc.storage = storage
	if _, err := svc.StartCapture(context.Background(), 1, 1, "Kamar", frames, extras); err != nil || len(queue.ids) != 1 {
		t.Fatalf("retry could not complete the upload: %v", err)
	}
}
