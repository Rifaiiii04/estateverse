package services

import (
	"context"
	"errors"
	"fmt"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// PropertyService defines business logic for property lifecycle and access.
type PropertyService interface {
	CreateProperty(ctx context.Context, ownerID int64, in models.PropertyInput) (*models.Property, error)
	UpdateProperty(ctx context.Context, id int64, ownerID int64, in models.PropertyInput) (*models.Property, error)
	DeleteProperty(ctx context.Context, id int64, ownerID int64) error
	GetPublicProperty(ctx context.Context, slug string) (*models.Property, error)
	ListPublicProperties(ctx context.Context, page, limit int) ([]models.Property, int, error)
	GetOwnerProperty(ctx context.Context, id int64, ownerID int64) (*models.Property, error)
	ListOwnerProperties(ctx context.Context, ownerID int64) ([]models.Property, error)
	GetDashboardSummary(ctx context.Context, ownerID int64) (*models.DashboardSummary, error)
}

type propertyService struct {
	propRepo   repositories.PropertyRepository
	imageRepo  repositories.PropertyImageRepository
	modelQueue ModelQueue
	tours      repositories.TourRepository
	photos     PhotoFingerprinter
}

// NewPropertyService instantiates the property business service with background 3D processing.
func NewPropertyService(
	pRepo repositories.PropertyRepository,
	iRepo repositories.PropertyImageRepository,
	mQueue ModelQueue,
) PropertyService {
	return newPropertyService(pRepo, iRepo, mQueue, nil, nil)
}

// NewPropertyServiceWithTours wires tour readiness into publication checks and, when photos is set, flags borrowed listing photos.
func NewPropertyServiceWithTours(
	pRepo repositories.PropertyRepository,
	iRepo repositories.PropertyImageRepository,
	mQueue ModelQueue,
	tours repositories.TourRepository,
	photos PhotoFingerprinter,
) PropertyService {
	return newPropertyService(pRepo, iRepo, mQueue, tours, photos)
}

// newPropertyService constructs the property service with optional tour readiness and photo-origin checks.
func newPropertyService(
	pRepo repositories.PropertyRepository,
	iRepo repositories.PropertyImageRepository,
	mQueue ModelQueue,
	tours repositories.TourRepository,
	photos PhotoFingerprinter,
) PropertyService {
	return &propertyService{
		propRepo:   pRepo,
		imageRepo:  iRepo,
		modelQueue: mQueue,
		tours:      tours,
		photos:     photos,
	}
}

// CreateProperty validates input, generates slug, and persists a new property with images.
func (s *propertyService) CreateProperty(ctx context.Context, ownerID int64, in models.PropertyInput) (*models.Property, error) {
	cleanIn, err := sanitizePropertyInput(in)
	if err != nil {
		return nil, err
	}

	requestedPublish := cleanIn.Status == models.StatusPublished
	initialStatus := cleanIn.Status
	if cleanIn.Model3DPath != "" && requestedPublish {
		initialStatus = models.StatusDraft
	}

	prop := &models.Property{
		OwnerID:        ownerID,
		Title:          cleanIn.Title,
		Slug:           generateSlug(cleanIn.Title),
		Description:    cleanIn.Description,
		PropertyType:   cleanIn.PropertyType,
		Price:          cleanIn.Price,
		Address:        cleanIn.Address,
		City:           cleanIn.City,
		Province:       cleanIn.Province,
		Latitude:       cleanIn.Latitude,
		Longitude:      cleanIn.Longitude,
		LandArea:       cleanIn.LandArea,
		BuildingArea:   cleanIn.BuildingArea,
		Bedrooms:       cleanIn.Bedrooms,
		Bathrooms:      cleanIn.Bathrooms,
		Floors:         cleanIn.Floors,
		WhatsAppNumber: cleanIn.WhatsAppNumber,
		Model3DPath:    cleanIn.Model3DPath,
		Benefits:       cleanIn.Benefits,
		Status:         initialStatus,
	}

	if err := s.propRepo.CreateWithImages(ctx, prop, cleanIn.Images); err != nil {
		return nil, fmt.Errorf("failed creating property: %w", err)
	}

	if cleanIn.Model3DPath != "" && s.modelQueue != nil {
		s.modelQueue.Enqueue(ModelProcessingJob{
			PropertyID:   prop.ID,
			RelativePath: cleanIn.Model3DPath,
			AutoPublish:  requestedPublish,
		})
	}

	return s.GetOwnerProperty(ctx, prop.ID, ownerID)
}

// UpdateProperty modifies existing property fields and synchronizes images atomically.
func (s *propertyService) UpdateProperty(ctx context.Context, id int64, ownerID int64, in models.PropertyInput) (*models.Property, error) {
	cleanIn, err := sanitizePropertyInput(in)
	if err != nil {
		return nil, err
	}

	existing, err := s.propRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil || existing.OwnerID != ownerID {
		return nil, ErrNotFound
	}

	modelChanged := cleanIn.Model3DPath != "" && cleanIn.Model3DPath != existing.Model3DPath
	requestedPublish := cleanIn.Status == models.StatusPublished
	if requestedPublish {
		ready, readinessErr := s.toursReadyForPublish(ctx, id)
		if readinessErr != nil {
			return nil, readinessErr
		}
		if !ready {
			requestedPublish = false
		}
	}

	existing.Title = cleanIn.Title
	existing.Description = cleanIn.Description
	existing.PropertyType = cleanIn.PropertyType
	existing.Price = cleanIn.Price
	existing.Address = cleanIn.Address
	existing.City = cleanIn.City
	existing.Province = cleanIn.Province
	if cleanIn.Latitude != nil { // clients that do not send a pin (e.g. older mobile builds) keep the stored one
		existing.Latitude, existing.Longitude = cleanIn.Latitude, cleanIn.Longitude
	}
	existing.LandArea = cleanIn.LandArea
	existing.BuildingArea = cleanIn.BuildingArea
	existing.Bedrooms = cleanIn.Bedrooms
	existing.Bathrooms = cleanIn.Bathrooms
	existing.Floors = cleanIn.Floors
	existing.WhatsAppNumber = cleanIn.WhatsAppNumber
	existing.Model3DPath = cleanIn.Model3DPath
	existing.Benefits = cleanIn.Benefits
	existing.Status = models.StatusDraft
	if requestedPublish {
		existing.Status = models.StatusPublished
	}
	if modelChanged {
		existing.Status = models.StatusDraft
	}

	replaceImages := in.Images != nil
	if err := s.propRepo.UpdateWithImages(ctx, existing, cleanIn.Images, replaceImages); err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if modelChanged && s.modelQueue != nil {
		s.modelQueue.Enqueue(ModelProcessingJob{
			PropertyID:   existing.ID,
			RelativePath: cleanIn.Model3DPath,
			AutoPublish:  requestedPublish,
		})
	}

	return s.GetOwnerProperty(ctx, id, ownerID)
}
