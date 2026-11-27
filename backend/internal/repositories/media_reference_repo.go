package repositories

import (
	"context"
	"database/sql"
	"fmt"
)

// MediaReferenceRepository answers which stored files are still used by a listing or a tour room.
type MediaReferenceRepository interface {
	IsReferenced(ctx context.Context, urlPath string) (bool, error)
	ListReferenced(ctx context.Context) (map[string]bool, error)
}

type mysqlMediaReferenceRepo struct {
	db *sql.DB
}

// NewMediaReferenceRepository instantiates a MySQL media reference repository.
func NewMediaReferenceRepository(db *sql.DB) MediaReferenceRepository {
	return &mysqlMediaReferenceRepo{db: db}
}

const referencedMediaQuery = `SELECT file_path FROM property_images
	UNION SELECT model_3d_path FROM properties WHERE model_3d_path <> ''
	UNION SELECT panorama_path FROM property_tour_rooms WHERE panorama_path <> ''
	UNION SELECT preview_path FROM property_tour_rooms WHERE preview_path <> ''`

// IsReferenced reports whether any listing photo, 3D model, or tour panorama still points at the file.
func (r *mysqlMediaReferenceRepo) IsReferenced(ctx context.Context, urlPath string) (bool, error) {
	var found bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM property_images WHERE file_path = ?)
		OR EXISTS(SELECT 1 FROM properties WHERE model_3d_path = ?)
		OR EXISTS(SELECT 1 FROM property_tour_rooms WHERE panorama_path = ? OR preview_path = ?)`,
		urlPath, urlPath, urlPath, urlPath).Scan(&found)
	if err != nil {
		return true, fmt.Errorf("failed checking media reference: %w", err) // fail closed: keep the file
	}
	return found, nil
}

// ListReferenced returns every storage URL path that the database still points at.
func (r *mysqlMediaReferenceRepo) ListReferenced(ctx context.Context) (map[string]bool, error) {
	rows, err := r.db.QueryContext(ctx, referencedMediaQuery)
	if err != nil {
		return nil, fmt.Errorf("failed listing media references: %w", err)
	}
	defer rows.Close()
	refs := map[string]bool{}
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, fmt.Errorf("failed scanning media reference: %w", err)
		}
		refs[p] = true
	}
	return refs, rows.Err()
}
