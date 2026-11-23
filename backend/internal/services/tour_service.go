package services

import (
	"context"
	"errors"
	"math"
	"strings"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// TourService manages sellers' recorded 360° rooms and the public virtual tour.
type TourService interface {
	StartCapture(ctx context.Context, ownerID, propertyID int64, name string, frames []CaptureFrame,
		extras CaptureExtras) (*models.TourRoom, error)
	ImportPanorama(ctx context.Context, ownerID, propertyID int64, name string, data []byte) (*models.TourRoom, error)
	OwnerRooms(ctx context.Context, ownerID, propertyID int64) ([]models.TourRoom, error)
	PublicRooms(ctx context.Context, propertyID int64) ([]models.TourRoom, error)
	GetOwnerRoom(ctx context.Context, ownerID, roomID int64) (*models.TourRoom, error)
	UpdateRoom(ctx context.Context, ownerID, roomID int64, name, note string) error
	SaveLayout(ctx context.Context, ownerID, roomID int64, layout models.RoomLayout) error
	DeleteRoom(ctx context.Context, ownerID, roomID int64) error
	ReorderRooms(ctx context.Context, ownerID, propertyID int64, roomIDs []int64) error
	AddHotspot(ctx context.Context, ownerID int64, h models.TourHotspot) (*models.TourHotspot, error)
	DeleteHotspot(ctx context.Context, ownerID, hotspotID int64) error
}

type tourService struct {
	tours   repositories.TourRepository
	props   repositories.PropertyRepository
	storage StorageService
	queue   TourQueue
}

// NewTourService wires the tour service with its repositories, storage, and stitching queue.
func NewTourService(tours repositories.TourRepository, props repositories.PropertyRepository,
	storage StorageService, queue TourQueue) TourService {
	return &tourService{tours: tours, props: props, storage: storage, queue: queue}
}

// StartCapture validates a recorded room, stores its frames privately, and queues stitching.
func (s *tourService) StartCapture(ctx context.Context, ownerID, propertyID int64, name string,
	frames []CaptureFrame, extras CaptureExtras) (*models.TourRoom, error) {
	property, err := s.ownedProperty(ctx, ownerID, propertyID)
	if err != nil {
		return nil, err
	}
	cleanName, err := validateRoomName(name)
	if err != nil {
		return nil, err
	}
	if err := validateCaptureFrames(frames); err != nil {
		return nil, err
	}
	if err := extras.normalize(); err != nil {
		return nil, err
	}
	if err := s.movePropertyToDraft(ctx, property); err != nil {
		return nil, err
	}
	room := &models.TourRoom{PropertyID: propertyID, Name: cleanName, Source: models.TourSourceCapture,
		CameraHeightCm: extras.CameraHeightCm, CaptureFix: extras.Location, Status: models.TourStatusProcessing,
		Hotspots: []models.TourHotspot{}}
	if err := s.tours.CreateRoom(ctx, room); err != nil {
		return nil, err
	}
	if err := storeCapture(s.storage, room.ID, cleanName, frames); err != nil {
		_ = s.tours.MarkFailed(ctx, room.ID, "Gagal menyimpan foto rekaman.")
		return nil, err
	}
	s.queue.Enqueue(room.ID)
	return s.reloadRoom(ctx, room), nil
}

// movePropertyToDraft keeps a published listing private while a new panorama is being processed.
func (s *tourService) movePropertyToDraft(ctx context.Context, property *models.Property) error {
	if property.Status != models.StatusPublished {
		return nil
	}
	property.Status = models.StatusDraft
	return s.props.UpdateWithImages(ctx, property, nil, false)
}

// reloadRoom re-reads a freshly created room so responses include database defaults such as created_at.
func (s *tourService) reloadRoom(ctx context.Context, room *models.TourRoom) *models.TourRoom {
	fresh, err := s.tours.GetRoom(ctx, room.ID)
	if err != nil {
		return room
	}
	return fresh
}

// OwnerRooms lists every room of a seller's property, including ones still processing.
func (s *tourService) OwnerRooms(ctx context.Context, ownerID, propertyID int64) ([]models.TourRoom, error) {
	prop, err := s.ownedProperty(ctx, ownerID, propertyID)
	if err != nil {
		return nil, err
	}
	rooms, err := s.tours.ListRooms(ctx, propertyID, false)
	return annotateLocation(rooms, prop), err
}

// PublicRooms lists ready rooms of a published property, dropping hotspots that lead to unfinished rooms.
func (s *tourService) PublicRooms(ctx context.Context, propertyID int64) ([]models.TourRoom, error) {
	prop, err := s.props.GetByID(ctx, propertyID)
	if err != nil || prop == nil || prop.Status != models.StatusPublished {
		return nil, ErrNotFound
	}
	rooms, err := s.tours.ListRooms(ctx, propertyID, true)
	if err != nil {
		return nil, err
	}
	return annotateLocation(dropDanglingHotspots(rooms), prop), nil
}

// GetOwnerRoom returns one room after confirming the seller owns its property.
func (s *tourService) GetOwnerRoom(ctx context.Context, ownerID, roomID int64) (*models.TourRoom, error) {
	room, err := s.tours.GetRoom(ctx, roomID)
	if errors.Is(err, repositories.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if _, err := s.ownedProperty(ctx, ownerID, room.PropertyID); err != nil {
		return nil, err
	}
	return room, nil
}

// UpdateRoom changes the display name and note of an owned room.
func (s *tourService) UpdateRoom(ctx context.Context, ownerID, roomID int64, name, note string) error {
	cleanName, err := validateRoomName(name)
	if err != nil {
		return err
	}
	cleanNote, err := validateRoomNote(note)
	if err != nil {
		return err
	}
	if _, err := s.GetOwnerRoom(ctx, ownerID, roomID); err != nil {
		return err
	}
	return s.tours.UpdateRoom(ctx, roomID, cleanName, cleanNote)
}

// DeleteRoom removes an owned room together with its panorama files and leftover frames.
func (s *tourService) DeleteRoom(ctx context.Context, ownerID, roomID int64) error {
	room, err := s.GetOwnerRoom(ctx, ownerID, roomID)
	if err != nil {
		return err
	}
	if err := s.tours.DeleteRoom(ctx, roomID); err != nil {
		return err
	}
	removeRoomFiles(s.storage, room)
	return nil
}

// ReorderRooms saves a new room order for an owned property.
func (s *tourService) ReorderRooms(ctx context.Context, ownerID, propertyID int64, roomIDs []int64) error {
	if _, err := s.ownedProperty(ctx, ownerID, propertyID); err != nil {
		return err
	}
	if len(roomIDs) > maxCaptureFrames {
		return newValidationError("terlalu banyak ruangan")
	}
	return s.tours.ReorderRooms(ctx, propertyID, roomIDs)
}

// prepareRoom checks property ownership and normalizes the room name.
func (s *tourService) prepareRoom(ctx context.Context, ownerID, propertyID int64, name string) (string, error) {
	if _, err := s.ownedProperty(ctx, ownerID, propertyID); err != nil {
		return "", err
	}
	return validateRoomName(name)
}

// ownedProperty loads a property and hides it unless the caller owns it.
func (s *tourService) ownedProperty(ctx context.Context, ownerID, propertyID int64) (*models.Property, error) {
	prop, err := s.props.GetByID(ctx, propertyID)
	if err != nil || prop == nil || prop.OwnerID != ownerID {
		return nil, ErrNotFound
	}
	return prop, nil
}

// removeRoomFiles deletes stored panoramas and any unprocessed frames of a room.
func removeRoomFiles(storage StorageService, room *models.TourRoom) {
	for _, p := range []string{room.PanoramaPath, room.PreviewPath} {
		if p != "" {
			_ = storage.DeleteFile(strings.TrimPrefix(p, "/api/v1/storage/"))
		}
	}
	_ = storage.RemoveAll(captureDir(room.ID))
}

// dropDanglingHotspots keeps only hotspots whose destination room is part of the list.
func dropDanglingHotspots(rooms []models.TourRoom) []models.TourRoom {
	present := make(map[int64]bool, len(rooms))
	for _, r := range rooms {
		present[r.ID] = true
	}
	for i := range rooms {
		kept := rooms[i].Hotspots[:0]
		for _, h := range rooms[i].Hotspots {
			if present[h.ToRoomID] {
				kept = append(kept, h)
			}
		}
		rooms[i].Hotspots = kept
	}
	return rooms
}

// validHotspotAngles checks yaw and pitch (degrees) are finite and within range.
func validHotspotAngles(yaw, pitch float64) bool {
	finite := !math.IsNaN(yaw) && !math.IsNaN(pitch) && !math.IsInf(yaw, 0) && !math.IsInf(pitch, 0)
	return finite && yaw >= -180 && yaw <= 180 && pitch >= -90 && pitch <= 90
}
