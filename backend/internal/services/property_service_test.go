package services

import (
	"context"
	"testing"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

type mockPropRepo struct {
	props  map[int64]*models.Property
	nextID int64
}

// CreateWithImages stores a property and registers mock images.
func (m *mockPropRepo) CreateWithImages(ctx context.Context, p *models.Property, images []string) error {
	m.nextID++
	p.ID = m.nextID
	c := *p
	m.props[p.ID] = &c
	return nil
}

// UpdateWithImages updates an existing property in the mock map.
func (m *mockPropRepo) UpdateWithImages(ctx context.Context, p *models.Property, images []string, replace bool) error {
	existing, ok := m.props[p.ID]
	if !ok || existing.OwnerID != p.OwnerID {
		return repositories.ErrNotFound
	}
	c := *p
	m.props[p.ID] = &c
	return nil
}

// Delete removes a property from the mock map.
func (m *mockPropRepo) Delete(ctx context.Context, id int64, ownerID int64) error {
	existing, ok := m.props[id]
	if !ok || existing.OwnerID != ownerID {
		return repositories.ErrNotFound
	}
	delete(m.props, id)
	return nil
}

// UpdateModelMetadata updates model metadata in the mock repository.
func (m *mockPropRepo) UpdateModelMetadata(ctx context.Context, id int64, meta *models.Model3DMetadata, autoPublish bool) error {
	p, ok := m.props[id]
	if !ok {
		return repositories.ErrNotFound
	}
	p.ModelMetadata = meta
	if autoPublish {
		p.Status = models.StatusPublished
	}
	return nil
}

// GetByID returns a property by primary ID.
func (m *mockPropRepo) GetByID(ctx context.Context, id int64) (*models.Property, error) {
	p := m.props[id]
	if p == nil {
		return nil, nil
	}
	c := *p
	return &c, nil
}

// GetPublishedBySlug returns a published listing matching the slug.
func (m *mockPropRepo) GetPublishedBySlug(ctx context.Context, slug string) (*models.Property, error) {
	for _, p := range m.props {
		if p.Slug == slug && p.Status == models.StatusPublished {
			c := *p
			return &c, nil
		}
	}
	return nil, nil
}

// ListPublished returns published listings from the mock.
func (m *mockPropRepo) ListPublished(ctx context.Context, limit, offset int) ([]models.Property, int, error) {
	var list []models.Property
	for _, p := range m.props {
		if p.Status == models.StatusPublished {
			list = append(list, *p)
		}
	}
	return list, len(list), nil
}

// ListByOwner returns listings belonging to the owner ID.
func (m *mockPropRepo) ListByOwner(ctx context.Context, ownerID int64) ([]models.Property, error) {
	var list []models.Property
	for _, p := range m.props {
		if p.OwnerID == ownerID {
			list = append(list, *p)
		}
	}
	return list, nil
}

// GetOwnerSummary aggregates counts for the seller dashboard.
func (m *mockPropRepo) GetOwnerSummary(ctx context.Context, ownerID int64) (*models.DashboardSummary, error) {
	s := &models.DashboardSummary{}
	for _, p := range m.props {
		if p.OwnerID == ownerID {
			s.TotalProperties++
			if p.Status == models.StatusDraft {
				s.DraftCount++
			} else {
				s.PublishedCount++
			}
		}
	}
	return s, nil
}

type mockImgRepo struct {
	images map[int64][]models.PropertyImage
}

// GetByPropertyID returns images for a given property ID.
func (m *mockImgRepo) GetByPropertyID(ctx context.Context, propertyID int64) ([]models.PropertyImage, error) {
	return m.images[propertyID], nil
}

// GetByPropertyIDs retrieves images for multiple property IDs.
func (m *mockImgRepo) GetByPropertyIDs(ctx context.Context, propertyIDs []int64) (map[int64][]models.PropertyImage, error) {
	res := make(map[int64][]models.PropertyImage)
	for _, id := range propertyIDs {
		res[id] = m.images[id]
	}
	return res, nil
}

// TestPropertyService_CreateAndDraftIsolation tests property creation, ownership, and privacy.
func TestPropertyService_CreateAndDraftIsolation(t *testing.T) {
	pRepo := &mockPropRepo{props: make(map[int64]*models.Property)}
	iRepo := &mockImgRepo{images: make(map[int64][]models.PropertyImage)}
	svc := NewPropertyService(pRepo, iRepo, nil)
	ctx := context.Background()

	input := models.PropertyInput{
		Title:          "Modern Villa Emerald",
		Description:    "Luxurious modern minimalist villa in North Bandung.",
		PropertyType:   "villa",
		Price:          1850000000,
		Address:        "Jl. Dago Asri No. 12",
		City:           "Bandung",
		Province:       "Jawa Barat",
		LandArea:       250,
		BuildingArea:   180,
		Bedrooms:       4,
		Bathrooms:      3,
		Floors:         2,
		WhatsAppNumber: "081234567890",
		Status:         models.StatusDraft,
		Images:         []string{"/api/v1/storage/images/20261026120000_1234567890abcdef.jpg"},
	}

	// 1. Create property for seller 1
	prop, err := svc.CreateProperty(ctx, 101, input)
	if err != nil {
		t.Fatalf("failed creating property: %v", err)
	}

	if prop.WhatsAppNumber != "6281234567890" {
		t.Errorf("expected normalized WhatsApp number, got: %s", prop.WhatsAppNumber)
	}
	if prop.Status != models.StatusDraft {
		t.Errorf("expected draft status, got: %s", prop.Status)
	}

	// 2. Draft property must NOT be accessible publicly
	_, err = svc.GetPublicProperty(ctx, prop.Slug)
	if err == nil {
		t.Errorf("expected draft property to be hidden from public view, got nil error")
	}

	// 3. Seller 2 cannot update or delete seller 1's property
	_, err = svc.UpdateProperty(ctx, prop.ID, 999, input)
	if err == nil {
		t.Errorf("expected unauthorized update error for another seller, got nil")
	}

	err = svc.DeleteProperty(ctx, prop.ID, 999)
	if err == nil {
		t.Errorf("expected unauthorized delete error for another seller, got nil")
	}

	// 4. Publish property and verify it is now publicly visible
	input.Status = models.StatusPublished
	updated, err := svc.UpdateProperty(ctx, prop.ID, 101, input)
	if err != nil {
		t.Fatalf("failed updating property to published: %v", err)
	}

	pub, err := svc.GetPublicProperty(ctx, updated.Slug)
	if err != nil {
		t.Fatalf("expected public property to be accessible after publish: %v", err)
	}
	if pub.ID != prop.ID {
		t.Errorf("expected property ID %d, got %d", prop.ID, pub.ID)
	}
}
