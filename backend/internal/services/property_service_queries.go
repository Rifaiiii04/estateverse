package services

import (
	"context"
	"errors"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// toursReadyForPublish reports whether every existing room has completed asynchronous stitching.
func (s *propertyService) toursReadyForPublish(ctx context.Context, propertyID int64) (bool, error) {
	if s.tours == nil {
		return true, nil
	}
	rooms, err := s.tours.ListRooms(ctx, propertyID, false)
	if err != nil {
		return false, err
	}
	for _, room := range rooms {
		if room.Status != models.TourStatusReady {
			return false, nil
		}
	}
	return true, nil
}

// DeleteProperty removes a property owned by the specified seller.
func (s *propertyService) DeleteProperty(ctx context.Context, id int64, ownerID int64) error {
	err := s.propRepo.Delete(ctx, id, ownerID)
	if errors.Is(err, repositories.ErrNotFound) {
		return ErrNotFound
	}
	return err
}

// GetPublicProperty fetches a single published listing with its images.
func (s *propertyService) GetPublicProperty(ctx context.Context, slug string) (*models.Property, error) {
	prop, err := s.propRepo.GetPublishedBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if prop == nil {
		return nil, ErrNotFound
	}
	images, err := s.imageRepo.GetByPropertyID(ctx, prop.ID)
	if err != nil {
		return nil, err
	}
	prop.Images = images
	s.attachPhotoOrigin(ctx, prop)
	return prop, nil
}

// ListPublicProperties lists published properties with pagination and batch image loading.
func (s *propertyService) ListPublicProperties(ctx context.Context, page, limit int) ([]models.Property, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 12
	}
	props, total, err := s.propRepo.ListPublished(ctx, limit, (page-1)*limit)
	if err != nil || len(props) == 0 {
		return props, total, err
	}
	if err := attachPropertyImagesBatch(ctx, s.imageRepo, props); err != nil {
		return nil, 0, err
	}
	return props, total, nil
}

// GetOwnerProperty returns a specific property belonging to the owner.
func (s *propertyService) GetOwnerProperty(ctx context.Context, id int64, ownerID int64) (*models.Property, error) {
	prop, err := s.propRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if prop == nil || prop.OwnerID != ownerID {
		return nil, ErrNotFound
	}
	images, err := s.imageRepo.GetByPropertyID(ctx, prop.ID)
	if err != nil {
		return nil, err
	}
	prop.Images = images
	s.attachPhotoOrigin(ctx, prop)
	return prop, nil
}

// ListOwnerProperties returns all properties created by the seller using batch image lookup.
func (s *propertyService) ListOwnerProperties(ctx context.Context, ownerID int64) ([]models.Property, error) {
	props, err := s.propRepo.ListByOwner(ctx, ownerID)
	if err != nil || len(props) == 0 {
		return props, err
	}
	if err := attachPropertyImagesBatch(ctx, s.imageRepo, props); err != nil {
		return nil, err
	}
	return props, nil
}

// GetDashboardSummary returns metrics count for the seller's properties.
func (s *propertyService) GetDashboardSummary(ctx context.Context, ownerID int64) (*models.DashboardSummary, error) {
	return s.propRepo.GetOwnerSummary(ctx, ownerID)
}

// attachPhotoOrigin counts listing photos reused from another seller; a lookup failure leaves the count at zero.
func (s *propertyService) attachPhotoOrigin(ctx context.Context, prop *models.Property) {
	if s.photos == nil || len(prop.Images) == 0 {
		return
	}
	count, err := s.photos.CountBorrowed(ctx, prop.ID, prop.OwnerID)
	if err == nil {
		prop.BorrowedPhotos = count
	}
}
