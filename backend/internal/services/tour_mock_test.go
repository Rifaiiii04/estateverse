package services

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"math"
	"math/rand"
	"sort"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// mockTourRepo is an in-memory TourRepository for service tests.
type mockTourRepo struct {
	receipts map[recordingKey]testReceipt
	rooms    map[int64]*models.TourRoom
	hotspots map[int64]*models.TourHotspot
	nextID   int64
}

// newMockTourRepo creates an empty in-memory tour repository.
func newMockTourRepo() *mockTourRepo {
	return &mockTourRepo{rooms: map[int64]*models.TourRoom{}, hotspots: map[int64]*models.TourHotspot{}}
}

// CreateRoom stores a copy of the room with a new id.
func (m *mockTourRepo) CreateRoom(_ context.Context, room *models.TourRoom) error {
	m.nextID++
	room.ID = m.nextID
	c := *room
	m.rooms[room.ID] = &c
	return nil
}

// GetRoom returns a copy of a stored room.
func (m *mockTourRepo) GetRoom(_ context.Context, id int64) (*models.TourRoom, error) {
	r, ok := m.rooms[id]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	c := *r
	return &c, nil
}

// ListRooms returns rooms of a property sorted by id, with hotspots attached.
func (m *mockTourRepo) ListRooms(_ context.Context, propertyID int64, readyOnly bool) ([]models.TourRoom, error) {
	out := []models.TourRoom{}
	for _, r := range m.rooms {
		if r.PropertyID == propertyID && (!readyOnly || r.Status == models.TourStatusReady) {
			c := *r
			c.Hotspots = m.hotspotsFrom(r.ID)
			out = append(out, c)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}

// hotspotsFrom collects hotspots starting at a room.
func (m *mockTourRepo) hotspotsFrom(roomID int64) []models.TourHotspot {
	out := []models.TourHotspot{}
	for _, h := range m.hotspots {
		if h.FromRoomID == roomID {
			out = append(out, *h)
		}
	}
	return out
}

// ListProcessing returns unfinished rooms so queue recovery can be tested after a restart.
func (m *mockTourRepo) ListProcessing(context.Context) ([]models.TourRoom, error) {
	rooms := make([]models.TourRoom, 0)
	for _, room := range m.rooms {
		if room.Status == models.TourStatusProcessing {
			copy := *room
			rooms = append(rooms, copy)
		}
	}
	sort.Slice(rooms, func(i, j int) bool { return rooms[i].ID < rooms[j].ID })
	return rooms, nil
}

// MarkReady records stitched output on the stored room.
func (m *mockTourRepo) MarkReady(_ context.Context, id int64, pano, preview string, quality int) error {
	r := m.rooms[id]
	if r == nil || r.Status != models.TourStatusProcessing {
		return repositories.ErrTourNotProcessing
	}
	r.Status, r.PanoramaPath, r.PreviewPath, r.QualityScore = models.TourStatusReady, pano, preview, quality
	return nil
}

// MarkFailed records a failure message on the stored room.
func (m *mockTourRepo) MarkFailed(_ context.Context, id int64, msg string) error {
	if r := m.rooms[id]; r == nil || r.Status != models.TourStatusProcessing {
		return repositories.ErrTourNotProcessing
	}
	m.rooms[id].Status, m.rooms[id].ErrorMessage = models.TourStatusFailed, msg
	return nil
}

// UpdateRoom updates a stored room name and note.
func (m *mockTourRepo) UpdateRoom(_ context.Context, id int64, name, note string) error {
	m.rooms[id].Name, m.rooms[id].Note = name, note
	return nil
}

// SaveLayout stores a room's camera height and floor outline.
func (m *mockTourRepo) SaveLayout(_ context.Context, id int64, layout models.RoomLayout) error {
	m.rooms[id].CameraHeightCm, m.rooms[id].FloorOutline = layout.CameraHeightCm, layout.FloorOutline
	return nil
}

// DeleteRoom removes a stored room.
func (m *mockTourRepo) DeleteRoom(_ context.Context, id int64) (*models.TourRoom, error) {
	room := m.rooms[id]
	if room == nil {
		return nil, repositories.ErrNotFound
	}
	delete(m.rooms, id)
	return room, nil
}

// ReorderRooms is a no-op for tests.
func (m *mockTourRepo) ReorderRooms(context.Context, int64, []int64) error { return nil }

// AddHotspot stores a hotspot with a new id.
func (m *mockTourRepo) AddHotspot(_ context.Context, h *models.TourHotspot) error {
	m.nextID++
	h.ID = m.nextID
	c := *h
	m.hotspots[h.ID] = &c
	return nil
}

// GetHotspot returns a stored hotspot.
func (m *mockTourRepo) GetHotspot(_ context.Context, id int64) (*models.TourHotspot, error) {
	h, ok := m.hotspots[id]
	if !ok {
		return nil, repositories.ErrNotFound
	}
	return h, nil
}

// DeleteHotspot removes a stored hotspot.
func (m *mockTourRepo) DeleteHotspot(_ context.Context, id int64) error {
	delete(m.hotspots, id)
	return nil
}

// DeleteOrphanRooms reports no orphans.
func (m *mockTourRepo) DeleteOrphanRooms(context.Context) ([]models.TourRoom, error) { return nil, nil }

// recordingQueue remembers enqueued room ids instead of stitching.
type recordingQueue struct{ ids []int64 }

// Enqueue records the room id.
func (q *recordingQueue) Enqueue(id int64) { q.ids = append(q.ids, id) }

// Start does nothing for the recording queue.
func (q *recordingQueue) Start(context.Context) {}

// testCaptureFrames builds n noisy JPEG frames with yaw-spaced horizon orientations.
func testCaptureFrames(n, w, h int) []CaptureFrame {
	rng := rand.New(rand.NewSource(5))
	frames := make([]CaptureFrame, n)
	for i := range frames {
		img := image.NewRGBA(image.Rect(0, 0, w, h))
		rng.Read(img.Pix)
		var buf bytes.Buffer
		_ = jpeg.Encode(&buf, img, &jpeg.Options{Quality: 80})
		yaw := float64(i) * 2 * math.Pi / float64(n)
		frames[i] = CaptureFrame{Data: buf.Bytes(), Orientation: [4]float64{math.Cos(-yaw / 2), 0, math.Sin(-yaw / 2), 0}}
	}
	return frames
}
