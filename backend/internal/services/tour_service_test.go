package services

import (
	"context"
	"errors"
	"os"
	"path"
	"strings"
	"testing"

	"projectfai/backend/internal/models"
)

// newTourFixture builds a tour service with one published property owned by user 1 and a draft owned by user 2.
func newTourFixture(t *testing.T) (*tourService, *mockTourRepo, *recordingQueue, StorageService) {
	t.Helper()
	props := &mockPropRepo{props: map[int64]*models.Property{
		1: {ID: 1, OwnerID: 1, Status: models.StatusPublished},
		2: {ID: 2, OwnerID: 2, Status: models.StatusDraft},
		3: {ID: 3, OwnerID: 1, Status: models.StatusPublished},
	}}
	tours, queue := newMockTourRepo(), &recordingQueue{}
	storage := NewStorageService(t.TempDir(), 50<<20)
	svc := NewTourService(tours, props, storage, queue).(*tourService)
	return svc, tours, queue, storage
}

// TestStartCaptureStoresFramesAndQueues verifies a valid capture is stored privately and queued.
func TestStartCaptureStoresFramesAndQueues(t *testing.T) {
	svc, _, queue, storage := newTourFixture(t)
	room, err := svc.StartCapture(context.Background(), 1, 1, "  Ruang   Tamu ", testCaptureFrames(12, 320, 400))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if room.Name != "Ruang Tamu" || room.Status != models.TourStatusProcessing {
		t.Fatalf("unexpected room: %+v", room)
	}
	if len(queue.ids) != 1 || queue.ids[0] != room.ID {
		t.Fatalf("expected room queued, got %v", queue.ids)
	}
	manifest, _ := storage.GetAbsolutePath(path.Join(captureDir(room.ID), captureManifestName))
	if _, err := os.Stat(manifest); err != nil {
		t.Fatalf("manifest not stored: %v", err)
	}
	if IsPublicCategory(captureDir(room.ID)) {
		t.Fatal("capture frames must not be publicly served")
	}
}

// TestStartCaptureRejectsForeignAndInvalidInput covers ownership and frame validation.
func TestStartCaptureRejectsForeignAndInvalidInput(t *testing.T) {
	svc, _, _, _ := newTourFixture(t)
	ctx := context.Background()
	if _, err := svc.StartCapture(ctx, 1, 2, "Dapur", testCaptureFrames(12, 320, 400)); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for foreign property, got %v", err)
	}
	if _, err := svc.StartCapture(ctx, 1, 1, "Dapur", testCaptureFrames(4, 320, 400)); err == nil {
		t.Fatal("expected validation error for too few frames")
	}
	frames := testCaptureFrames(12, 320, 400)
	frames[5].Data = []byte("not a jpeg")
	if _, err := svc.StartCapture(ctx, 1, 1, "Dapur", frames); err == nil {
		t.Fatal("expected validation error for invalid JPEG")
	}
	if _, err := svc.StartCapture(ctx, 1, 1, "", testCaptureFrames(12, 320, 400)); err == nil {
		t.Fatal("expected validation error for empty name")
	}
}

// TestQueueProcessProducesPanorama runs the real stitching worker over a stored capture.
func TestQueueProcessProducesPanorama(t *testing.T) {
	svc, tours, _, storage := newTourFixture(t)
	room, err := svc.StartCapture(context.Background(), 1, 1, "Kamar", testCaptureFrames(12, 320, 400))
	if err != nil {
		t.Fatalf("capture failed: %v", err)
	}
	q := NewTourQueue(tours, storage).(*tourQueue)
	q.process(context.Background(), room.ID)

	done := tours.rooms[room.ID]
	if done.Status != models.TourStatusReady || !strings.HasPrefix(done.PanoramaPath, "/api/v1/storage/panoramas/") {
		t.Fatalf("expected ready room with panorama, got %+v", done)
	}
	if abs, _ := storage.GetAbsolutePath(captureDir(room.ID)); dirExists(abs) {
		t.Fatal("capture frames should be removed after stitching")
	}
}

// TestPublicRoomsHidesDraftsAndDanglingHotspots checks buyers only see ready rooms of published listings.
func TestPublicRoomsHidesDraftsAndDanglingHotspots(t *testing.T) {
	svc, tours, _, _ := newTourFixture(t)
	ctx := context.Background()
	ready := &models.TourRoom{PropertyID: 1, Name: "Teras", Status: models.TourStatusReady}
	pending := &models.TourRoom{PropertyID: 1, Name: "Dapur", Status: models.TourStatusProcessing}
	_ = tours.CreateRoom(ctx, ready)
	_ = tours.CreateRoom(ctx, pending)
	_ = tours.AddHotspot(ctx, &models.TourHotspot{FromRoomID: ready.ID, ToRoomID: pending.ID})

	rooms, err := svc.PublicRooms(ctx, 1)
	if err != nil || len(rooms) != 1 || len(rooms[0].Hotspots) != 0 {
		t.Fatalf("expected one ready room without dangling hotspot, got %+v (err %v)", rooms, err)
	}
	if _, err := svc.PublicRooms(ctx, 2); !errors.Is(err, ErrNotFound) {
		t.Fatalf("draft property tour must be hidden, got %v", err)
	}
}

// TestAddHotspotRequiresSameOwnedProperty rejects links across properties and invalid angles.
func TestAddHotspotRequiresSameOwnedProperty(t *testing.T) {
	svc, tours, _, _ := newTourFixture(t)
	ctx := context.Background()
	a := &models.TourRoom{PropertyID: 1, Name: "A", Status: models.TourStatusReady}
	b := &models.TourRoom{PropertyID: 3, Name: "B", Status: models.TourStatusReady}
	c := &models.TourRoom{PropertyID: 1, Name: "C", Status: models.TourStatusReady}
	_, _, _ = tours.CreateRoom(ctx, a), tours.CreateRoom(ctx, b), tours.CreateRoom(ctx, c)

	if _, err := svc.AddHotspot(ctx, 1, models.TourHotspot{FromRoomID: a.ID, ToRoomID: b.ID}); err == nil {
		t.Fatal("expected cross-property hotspot to be rejected")
	}
	if _, err := svc.AddHotspot(ctx, 1, models.TourHotspot{FromRoomID: a.ID, ToRoomID: c.ID, Yaw: 400}); err == nil {
		t.Fatal("expected out-of-range yaw to be rejected")
	}
	if _, err := svc.AddHotspot(ctx, 2, models.TourHotspot{FromRoomID: a.ID, ToRoomID: c.ID}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected non-owner to get ErrNotFound, got %v", err)
	}
	if _, err := svc.AddHotspot(ctx, 1, models.TourHotspot{FromRoomID: a.ID, ToRoomID: c.ID, Yaw: 90}); err != nil {
		t.Fatalf("expected valid hotspot, got %v", err)
	}
}

// dirExists reports whether a directory exists on disk.
func dirExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && info.IsDir()
}

// TestUpdateRoomSavesNoteAndRejectsLongNotes keeps notes short enough to show inside the viewer.
func TestUpdateRoomSavesNoteAndRejectsLongNotes(t *testing.T) {
	svc, tours, _, _ := newTourFixture(t)
	ctx := context.Background()
	room := &models.TourRoom{PropertyID: 1, Name: "Kamar", Status: models.TourStatusReady}
	_ = tours.CreateRoom(ctx, room)

	if err := svc.UpdateRoom(ctx, 1, room.ID, "Kamar Utama", "  3×3 m,   jendela timur "); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := tours.rooms[room.ID]; got.Name != "Kamar Utama" || got.Note != "3×3 m, jendela timur" {
		t.Fatalf("unexpected room after update: %+v", got)
	}
	if err := svc.UpdateRoom(ctx, 1, room.ID, "Kamar", strings.Repeat("a", 161)); err == nil {
		t.Fatal("expected validation error for a note over 160 characters")
	}
	if err := svc.UpdateRoom(ctx, 2, room.ID, "Kamar", ""); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound for another seller, got %v", err)
	}
}
