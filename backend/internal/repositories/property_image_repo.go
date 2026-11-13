package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"projectfai/backend/internal/models"
)

// PropertyImageRepository defines read operations for property images.
type PropertyImageRepository interface {
	GetByPropertyID(ctx context.Context, propertyID int64) ([]models.PropertyImage, error)
	GetByPropertyIDs(ctx context.Context, propertyIDs []int64) (map[int64][]models.PropertyImage, error)
}

type mysqlPropertyImageRepo struct {
	db *sql.DB
}

// NewPropertyImageRepository instantiates a MySQL property image repository.
func NewPropertyImageRepository(db *sql.DB) PropertyImageRepository {
	return &mysqlPropertyImageRepo{db: db}
}

// GetByPropertyID retrieves all images associated with a given property ID.
func (r *mysqlPropertyImageRepo) GetByPropertyID(ctx context.Context, propertyID int64) ([]models.PropertyImage, error) {
	grouped, err := r.GetByPropertyIDs(ctx, []int64{propertyID})
	if err != nil {
		return nil, err
	}
	return grouped[propertyID], nil
}

// GetByPropertyIDs loads images for many properties in one query to avoid N+1 lookups.
func (r *mysqlPropertyImageRepo) GetByPropertyIDs(ctx context.Context, propertyIDs []int64) (map[int64][]models.PropertyImage, error) {
	grouped := make(map[int64][]models.PropertyImage, len(propertyIDs))
	if len(propertyIDs) == 0 {
		return grouped, nil
	}

	// Placeholders are generated from the slice length only; values stay parameterized.
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(propertyIDs)), ",")
	query := `SELECT id, property_id, file_path, COALESCE(alt_text, ''), sort_order, created_at
		FROM property_images WHERE property_id IN (` + placeholders + `)
		ORDER BY property_id, sort_order ASC, id ASC`

	args := make([]interface{}, len(propertyIDs))
	for i, id := range propertyIDs {
		args[i] = id
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query property images: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var img models.PropertyImage
		if err := rows.Scan(&img.ID, &img.PropertyID, &img.FilePath, &img.AltText, &img.SortOrder, &img.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan property image: %w", err)
		}
		grouped[img.PropertyID] = append(grouped[img.PropertyID], img)
	}
	return grouped, rows.Err()
}

// replaceImagesTx replaces all images of a property inside an existing transaction.
func replaceImagesTx(ctx context.Context, tx *sql.Tx, propertyID int64, imagePaths []string) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM property_images WHERE property_id = ?`, propertyID); err != nil {
		return fmt.Errorf("failed deleting old images: %w", err)
	}
	if len(imagePaths) == 0 {
		return nil
	}

	stmt, err := tx.PrepareContext(ctx, `INSERT INTO property_images (property_id, file_path, alt_text, sort_order) VALUES (?, ?, '', ?)`)
	if err != nil {
		return fmt.Errorf("failed preparing image insert: %w", err)
	}
	defer stmt.Close()

	for order, path := range imagePaths {
		if _, err := stmt.ExecContext(ctx, propertyID, path, order); err != nil {
			return fmt.Errorf("failed inserting image: %w", err)
		}
	}
	return nil
}
