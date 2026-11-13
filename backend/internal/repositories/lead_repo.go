package repositories

import (
	"context"
	"database/sql"
	"fmt"

	"projectfai/backend/internal/models"
)

// LeadRepository abstracts persistence operations for buyer inquiries and leads.
type LeadRepository interface {
	Create(ctx context.Context, lead *models.Lead) error
	ListByOwner(ctx context.Context, ownerID int64) ([]models.Lead, error)
	UpdateStatus(ctx context.Context, id int64, ownerID int64, status string) error
}

type mysqlLeadRepo struct {
	db *sql.DB
}

// NewLeadRepository instantiates a MySQL lead repository.
func NewLeadRepository(db *sql.DB) LeadRepository {
	return &mysqlLeadRepo{db: db}
}

// Create inserts a new buyer inquiry into the database.
func (r *mysqlLeadRepo) Create(ctx context.Context, lead *models.Lead) error {
	query := `INSERT INTO leads (property_id, owner_id, name, phone, budget, note, status)
		VALUES (?, ?, ?, ?, ?, ?, ?)`
	res, err := r.db.ExecContext(ctx, query,
		lead.PropertyID, lead.OwnerID, lead.Name, lead.Phone, lead.Budget, lead.Note, lead.Status,
	)
	if err != nil {
		return fmt.Errorf("failed inserting lead: %w", err)
	}
	id, err := res.LastInsertId()
	if err == nil {
		lead.ID = id
	}
	return nil
}

// ListByOwner retrieves all buyer leads belonging to properties owned by a seller.
func (r *mysqlLeadRepo) ListByOwner(ctx context.Context, ownerID int64) ([]models.Lead, error) {
	query := `SELECT l.id, l.property_id, l.owner_id, l.name, l.phone, l.budget, l.note,
		l.status, l.created_at, l.updated_at, COALESCE(p.title, ''), COALESCE(p.slug, '')
		FROM leads l
		JOIN properties p ON p.id = l.property_id
		WHERE l.owner_id = ?
		ORDER BY l.created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, ownerID)
	if err != nil {
		return nil, fmt.Errorf("failed listing owner leads: %w", err)
	}
	defer rows.Close()

	var leads []models.Lead
	for rows.Next() {
		var item models.Lead
		err := rows.Scan(
			&item.ID, &item.PropertyID, &item.OwnerID, &item.Name, &item.Phone,
			&item.Budget, &item.Note, &item.Status, &item.CreatedAt, &item.UpdatedAt,
			&item.PropertyTitle, &item.PropertySlug,
		)
		if err != nil {
			return nil, fmt.Errorf("failed scanning lead row: %w", err)
		}
		leads = append(leads, item)
	}
	if leads == nil {
		leads = []models.Lead{}
	}
	return leads, rows.Err()
}

// UpdateStatus modifies the pipeline status of a specific lead.
func (r *mysqlLeadRepo) UpdateStatus(ctx context.Context, id int64, ownerID int64, status string) error {
	query := `UPDATE leads SET status = ? WHERE id = ? AND owner_id = ?`
	res, err := r.db.ExecContext(ctx, query, status, id, ownerID)
	if err != nil {
		return fmt.Errorf("failed updating lead status: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}
