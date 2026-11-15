package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"projectfai/backend/internal/models"
)

// PropertyRepository defines database operations for property listings.
type PropertyRepository interface {
	CreateWithImages(ctx context.Context, p *models.Property, images []string) error
	UpdateWithImages(ctx context.Context, p *models.Property, images []string, replaceImages bool) error
	UpdateModelMetadata(ctx context.Context, id int64, meta *models.Model3DMetadata, autoPublish bool) error
	Delete(ctx context.Context, id int64, ownerID int64) error
	GetByID(ctx context.Context, id int64) (*models.Property, error)
	GetPublishedBySlug(ctx context.Context, slug string) (*models.Property, error)
	ListPublished(ctx context.Context, limit, offset int) ([]models.Property, int, error)
	ListByOwner(ctx context.Context, ownerID int64) ([]models.Property, error)
	GetOwnerSummary(ctx context.Context, ownerID int64) (*models.DashboardSummary, error)
}

type mysqlPropertyRepo struct {
	db *sql.DB
}

// NewPropertyRepository instantiates a MySQL property repository.
func NewPropertyRepository(db *sql.DB) PropertyRepository {
	if db != nil {
		_, _ = db.Exec(`ALTER TABLE properties ADD COLUMN benefits JSON NULL AFTER model_metadata`)
	}
	return &mysqlPropertyRepo{db: db}
}

// CreateWithImages atomically inserts a property and its gallery images.
func (r *mysqlPropertyRepo) CreateWithImages(ctx context.Context, p *models.Property, images []string) error {
	benefitsJSON, err := json.Marshal(p.Benefits)
	if err != nil || len(p.Benefits) == 0 {
		benefitsJSON = []byte("[]")
	}
	return withTx(ctx, r.db, func(tx *sql.Tx) error {
		query := `INSERT INTO properties (
			owner_id, title, slug, description, property_type, price,
			address, city, province, land_area, building_area,
			bedrooms, bathrooms, floors, whatsapp_number, model_3d_path, benefits, status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

		res, err := tx.ExecContext(ctx, query,
			p.OwnerID, p.Title, p.Slug, p.Description, p.PropertyType, p.Price,
			p.Address, p.City, p.Province, p.LandArea, p.BuildingArea,
			p.Bedrooms, p.Bathrooms, p.Floors, p.WhatsAppNumber, p.Model3DPath, string(benefitsJSON), p.Status,
		)
		if err != nil {
			return fmt.Errorf("failed to insert property: %w", err)
		}
		if p.ID, err = res.LastInsertId(); err != nil {
			return err
		}
		return replaceImagesTx(ctx, tx, p.ID, images)
	})
}

// UpdateWithImages atomically updates an owned property and optionally replaces its images.
func (r *mysqlPropertyRepo) UpdateWithImages(ctx context.Context, p *models.Property, images []string, replaceImages bool) error {
	benefitsJSON, err := json.Marshal(p.Benefits)
	if err != nil || len(p.Benefits) == 0 {
		benefitsJSON = []byte("[]")
	}
	return withTx(ctx, r.db, func(tx *sql.Tx) error {
		query := `UPDATE properties SET
			title = ?, description = ?, property_type = ?, price = ?,
			address = ?, city = ?, province = ?, land_area = ?, building_area = ?,
			bedrooms = ?, bathrooms = ?, floors = ?, whatsapp_number = ?,
			model_3d_path = ?, benefits = ?, status = ?
			WHERE id = ? AND owner_id = ?`

		res, err := tx.ExecContext(ctx, query,
			p.Title, p.Description, p.PropertyType, p.Price,
			p.Address, p.City, p.Province, p.LandArea, p.BuildingArea,
			p.Bedrooms, p.Bathrooms, p.Floors, p.WhatsAppNumber,
			p.Model3DPath, string(benefitsJSON), p.Status, p.ID, p.OwnerID,
		)
		if err != nil {
			return fmt.Errorf("failed to update property: %w", err)
		}
		if err := requireAffected(res); err != nil {
			return err
		}
		if !replaceImages {
			return nil
		}
		return replaceImagesTx(ctx, tx, p.ID, images)
	})
}

// Delete permanently removes a property owned by the specified user; images cascade via FK.
func (r *mysqlPropertyRepo) Delete(ctx context.Context, id int64, ownerID int64) error {
	query := `DELETE FROM properties WHERE id = ? AND owner_id = ?`
	res, err := r.db.ExecContext(ctx, query, id, ownerID)
	if err != nil {
		return fmt.Errorf("failed to delete property: %w", err)
	}
	return requireAffected(res)
}

// UpdateModelMetadata updates precomputed 3D geometry layout and optionally activates publishing.
func (r *mysqlPropertyRepo) UpdateModelMetadata(ctx context.Context, id int64, meta *models.Model3DMetadata, autoPublish bool) error {
	raw, err := json.Marshal(meta)
	if err != nil {
		return err
	}
	if autoPublish {
		query := `UPDATE properties SET model_metadata = ?,
			status = CASE WHEN ? AND NOT EXISTS (
				SELECT 1 FROM property_tour_rooms
				WHERE property_id = properties.id AND status <> 'ready'
			) THEN 'published' ELSE status END WHERE id = ?`
		_, err = r.db.ExecContext(ctx, query, string(raw), autoPublish, id)
	} else {
		query := `UPDATE properties SET model_metadata = ? WHERE id = ?`
		_, err = r.db.ExecContext(ctx, query, string(raw), id)
	}
	return err
}

// withTx runs fn inside a transaction, committing on success and rolling back on error.
func withTx(ctx context.Context, db *sql.DB, fn func(tx *sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit()
}

// requireAffected returns ErrNotFound when a write matched no rows (missing or not owned).
func requireAffected(res sql.Result) error {
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}
