package services

import (
	"context"
	"log/slog"

	"projectfai/backend/internal/models"
)

// listingMedia collects the stored files a listing points at, so they can be released after it changes or is deleted.
func (s *propertyService) listingMedia(ctx context.Context, prop *models.Property) []string {
	if s.media == nil || prop == nil {
		return nil
	}
	paths := []string{}
	if prop.Model3DPath != "" {
		paths = append(paths, prop.Model3DPath)
	}
	images, err := s.imageRepo.GetByPropertyID(ctx, prop.ID)
	if err != nil {
		slog.Warn("listing media lookup failed", "property_id", prop.ID, "error", err)
		return paths
	}
	for _, img := range images {
		paths = append(paths, img.FilePath)
	}
	return paths
}

// releaseMedia deletes the given files unless another listing or room still references them.
func (s *propertyService) releaseMedia(ctx context.Context, paths []string) {
	if s.media != nil && len(paths) > 0 {
		s.media.Release(ctx, paths)
	}
}

// listingRooms returns every tour room of a listing (ready or not) so they can be removed with it.
func (s *propertyService) listingRooms(ctx context.Context, propertyID int64) []models.TourRoom {
	if s.tours == nil || s.media == nil {
		return nil
	}
	rooms, err := s.tours.ListRooms(ctx, propertyID, false)
	if err != nil {
		slog.Warn("listing rooms lookup failed", "property_id", propertyID, "error", err)
		return nil
	}
	return rooms
}

// removeListingRooms deletes the rooms of a deleted listing and their panorama files right away.
func (s *propertyService) removeListingRooms(ctx context.Context, rooms []models.TourRoom) {
	for i := range rooms {
		deleted, err := s.tours.DeleteRoom(ctx, rooms[i].ID)
		if err != nil {
			slog.Warn("failed deleting room of deleted listing", "room_id", rooms[i].ID, "error", err)
			continue
		}
		s.media.ReleaseRoom(ctx, deleted)
	}
}

// hideMissingPhotos drops gallery entries whose file is gone and counts them for the buyer-facing trust check.
func (s *propertyService) hideMissingPhotos(prop *models.Property) {
	if s.media == nil || len(prop.Images) == 0 {
		return
	}
	kept := prop.Images[:0]
	for _, img := range prop.Images {
		if s.media.IsMissing(img.FilePath) {
			prop.UnreadablePhotos++
			continue
		}
		kept = append(kept, img)
	}
	prop.Images = kept
}
