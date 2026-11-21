package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"projectfai/backend/internal/models"
)

// propertyColumns lists the selected property columns in scan order.
const propertyColumns = `p.id, p.owner_id, p.title, p.slug, p.description, p.property_type,
	p.price, p.address, p.city, p.province, p.latitude, p.longitude, p.land_area, p.building_area,
	p.bedrooms, p.bathrooms, p.floors, p.whatsapp_number, COALESCE(p.model_3d_path, ''),
	COALESCE(p.model_metadata, ''), COALESCE(p.benefits, '[]'), p.status, p.created_at, p.updated_at, COALESCE(u.name, ''),
	EXISTS(SELECT 1 FROM property_tour_rooms t WHERE t.property_id = p.id AND t.status = 'ready')`

// GetByID finds a property by ID including seller owner name.
func (r *mysqlPropertyRepo) GetByID(ctx context.Context, id int64) (*models.Property, error) {
	query := `SELECT ` + propertyColumns + `
		FROM properties p JOIN users u ON u.id = p.owner_id
		WHERE p.id = ?`
	return scanProperty(r.db.QueryRowContext(ctx, query, id))
}

// GetPublishedBySlug finds a property by slug only when it is published.
func (r *mysqlPropertyRepo) GetPublishedBySlug(ctx context.Context, slug string) (*models.Property, error) {
	query := `SELECT ` + propertyColumns + `
		FROM properties p JOIN users u ON u.id = p.owner_id
		WHERE p.slug = ? AND p.status = 'published'`
	return scanProperty(r.db.QueryRowContext(ctx, query, slug))
}

// ListPublished retrieves published listings with total count for public viewing.
func (r *mysqlPropertyRepo) ListPublished(ctx context.Context, limit, offset int) ([]models.Property, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM properties WHERE status = 'published'`
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}
	if total == 0 || offset >= total {
		return []models.Property{}, total, nil
	}

	query := `SELECT ` + propertyColumns + `
		FROM properties p JOIN users u ON u.id = p.owner_id
		WHERE p.status = 'published'
		ORDER BY p.created_at DESC, p.id DESC
		LIMIT ? OFFSET ?`
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list, err := scanPropertiesList(rows)
	return list, total, err
}

// ListByOwner retrieves all properties belonging to a specific seller.
func (r *mysqlPropertyRepo) ListByOwner(ctx context.Context, ownerID int64) ([]models.Property, error) {
	query := `SELECT ` + propertyColumns + `
		FROM properties p JOIN users u ON u.id = p.owner_id
		WHERE p.owner_id = ?
		ORDER BY p.updated_at DESC, p.id DESC`
	rows, err := r.db.QueryContext(ctx, query, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPropertiesList(rows)
}

// GetOwnerSummary calculates rich property metrics and performance statistics for the seller dashboard.
func (r *mysqlPropertyRepo) GetOwnerSummary(ctx context.Context, ownerID int64) (*models.DashboardSummary, error) {
	query := `SELECT
		COUNT(*),
		CAST(COALESCE(SUM(status = 'draft'), 0) AS SIGNED),
		CAST(COALESCE(SUM(status = 'published'), 0) AS SIGNED),
		CAST(COALESCE(SUM(price), 0) AS SIGNED),
		COALESCE(AVG(price), 0),
		CAST(COALESCE(SUM(CASE WHEN model_3d_path != '' AND model_3d_path IS NOT NULL THEN 1 ELSE 0 END), 0) AS SIGNED),
		COALESCE(SUM(land_area), 0),
		COALESCE(SUM(building_area), 0)
		FROM properties WHERE owner_id = ?`

	var s models.DashboardSummary
	var avgPrice float64
	err := r.db.QueryRowContext(ctx, query, ownerID).Scan(
		&s.TotalProperties,
		&s.DraftCount,
		&s.PublishedCount,
		&s.TotalPortfolioValue,
		&avgPrice,
		&s.With3DModelCount,
		&s.TotalLandArea,
		&s.TotalBuildingArea,
	)
	if err != nil {
		return nil, err
	}
	s.AveragePrice = int64(avgPrice)

	s.TypeBreakdown = make(map[string]int)
	typeRows, err := r.db.QueryContext(ctx, "SELECT property_type, COUNT(*) FROM properties WHERE owner_id = ? GROUP BY property_type", ownerID)
	if err == nil {
		defer typeRows.Close()
		for typeRows.Next() {
			var pType string
			var count int
			if scanErr := typeRows.Scan(&pType, &count); scanErr == nil {
				s.TypeBreakdown[pType] = count
			}
		}
	}

	if err := r.fillEngagement(ctx, ownerID, &s); err != nil {
		return nil, err
	}

	return &s, nil
}

// rowScanner abstracts *sql.Row and *sql.Rows for shared scanning.
type rowScanner interface {
	Scan(dest ...interface{}) error
}

// scanPropertyInto maps one result row into a Property struct.
func scanPropertyInto(s rowScanner, p *models.Property) error {
	var metaRaw string
	var benefitsRaw string
	var lat, lng sql.NullFloat64
	err := s.Scan(
		&p.ID, &p.OwnerID, &p.Title, &p.Slug, &p.Description, &p.PropertyType,
		&p.Price, &p.Address, &p.City, &p.Province, &lat, &lng, &p.LandArea, &p.BuildingArea,
		&p.Bedrooms, &p.Bathrooms, &p.Floors, &p.WhatsAppNumber, &p.Model3DPath,
		&metaRaw, &benefitsRaw, &p.Status, &p.CreatedAt, &p.UpdatedAt, &p.OwnerName, &p.HasTour,
	)
	if err != nil {
		return err
	}
	if lat.Valid && lng.Valid {
		p.Latitude, p.Longitude = &lat.Float64, &lng.Float64
	}
	if metaRaw != "" && metaRaw != "{}" {
		var meta models.Model3DMetadata
		if err := json.Unmarshal([]byte(metaRaw), &meta); err == nil {
			p.ModelMetadata = &meta
		}
	}
	p.Benefits = []string{}
	if benefitsRaw != "" && benefitsRaw != "[]" {
		_ = json.Unmarshal([]byte(benefitsRaw), &p.Benefits)
	}
	return nil
}

// scanProperty maps a single row into a Property, returning nil when no row exists.
func scanProperty(row *sql.Row) (*models.Property, error) {
	var p models.Property
	err := scanPropertyInto(row, &p)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to scan property: %w", err)
	}
	return &p, nil
}

// scanPropertiesList maps multiple rows into a slice of Property structs.
func scanPropertiesList(rows *sql.Rows) ([]models.Property, error) {
	list := []models.Property{}
	for rows.Next() {
		var p models.Property
		if err := scanPropertyInto(rows, &p); err != nil {
			return nil, fmt.Errorf("failed to scan property row: %w", err)
		}
		list = append(list, p)
	}
	return list, rows.Err()
}
