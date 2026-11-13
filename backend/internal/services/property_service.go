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
}

// NewPropertyService instantiates the property business service with background 3D processing.
func NewPropertyService(
	pRepo repositories.PropertyRepository,
	iRepo repositories.PropertyImageRepository,
	mQueue ModelQueue,
) PropertyService {
	return &propertyService{
		propRepo:   pRepo,
		imageRepo:  iRepo,
		modelQueue: mQueue,
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

	existing.Title = cleanIn.Title
	existing.Description = cleanIn.Description
	existing.PropertyType = cleanIn.PropertyType
	existing.Price = cleanIn.Price
	existing.Address = cleanIn.Address
	existing.City = cleanIn.City
	existing.Province = cleanIn.Province
	existing.LandArea = cleanIn.LandArea
	existing.BuildingArea = cleanIn.BuildingArea
	existing.Bedrooms = cleanIn.Bedrooms
	existing.Bathrooms = cleanIn.Bathrooms
	existing.Floors = cleanIn.Floors
	existing.WhatsAppNumber = cleanIn.WhatsAppNumber
	existing.Model3DPath = cleanIn.Model3DPath
	existing.Benefits = cleanIn.Benefits
	existing.Status = cleanIn.Status

	modelChanged := cleanIn.Model3DPath != "" && cleanIn.Model3DPath != existing.Model3DPath
	requestedPublish := cleanIn.Status == models.StatusPublished
	if modelChanged && requestedPublish {
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
	offset := (page - 1) * limit

	props, total, err := s.propRepo.ListPublished(ctx, limit, offset)
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
