package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"projectfai/backend/internal/models"
)

// ActivityLogRepository persists and queries backend activity history.
type ActivityLogRepository interface {
	Create(ctx context.Context, input models.ActivityLogInput) error
	ListForUser(ctx context.Context, userID int64, limit, offset int) ([]models.ActivityLog, error)
}

type mysqlActivityLogRepo struct {
	db *sql.DB
}

// NewActivityLogRepository instantiates a MySQL-backed activity history repository.
func NewActivityLogRepository(db *sql.DB) ActivityLogRepository {
	return &mysqlActivityLogRepo{db: db}
}

// Create inserts one activity record while allowing a database-less development server to run.
func (r *mysqlActivityLogRepo) Create(ctx context.Context, input models.ActivityLogInput) error {
	if r.db == nil {
		return nil
	}
	metadata, err := json.Marshal(input.Metadata)
	if err != nil {
		return fmt.Errorf("failed encoding activity metadata: %w", err)
	}
	_, err = r.db.ExecContext(ctx, `INSERT INTO activity_logs
		(actor_user_id, action, status, method, path, request_id, resource_type, resource_id,
		 message, details, metadata, ip_address, user_agent)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, nullableID(input.UserID), input.Action,
		input.Status, input.Method, input.Path, input.RequestID, input.ResourceType,
		nullableID(input.ResourceID), input.Message, nullableText(input.Details), string(metadata),
		input.IPAddress, input.UserAgent)
	if err != nil {
		return fmt.Errorf("failed inserting activity log: %w", err)
	}
	return nil
}

// ListForUser returns newest activity records owned by one authenticated seller.
func (r *mysqlActivityLogRepo) ListForUser(ctx context.Context, userID int64, limit, offset int) ([]models.ActivityLog, error) {
	if r.db == nil {
		return nil, fmt.Errorf("activity history database is unavailable")
	}
	rows, err := r.db.QueryContext(ctx, `SELECT id, action, status, method, path, request_id,
		resource_type, resource_id, message, metadata, ip_address, user_agent, created_at
		FROM activity_logs WHERE actor_user_id = ?
		OR (resource_type = 'property' AND resource_id IN (
			SELECT id FROM properties WHERE owner_id = ?
		))
		OR (resource_type = 'tour_room' AND resource_id IN (
			SELECT tr.id FROM property_tour_rooms tr
			INNER JOIN properties p ON p.id = tr.property_id WHERE p.owner_id = ?
		))
		ORDER BY id DESC LIMIT ? OFFSET ?`, userID, userID, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed querying activity history: %w", err)
	}
	defer rows.Close()
	logs := make([]models.ActivityLog, 0)
	for rows.Next() {
		entry, err := scanActivityLog(rows)
		if err != nil {
			return nil, err
		}
		logs = append(logs, *entry)
	}
	return logs, rows.Err()
}

// scanActivityLog maps one database row into a public activity record.
func scanActivityLog(row interface{ Scan(...interface{}) error }) (*models.ActivityLog, error) {
	var entry models.ActivityLog
	var resourceID sql.NullInt64
	var metadata []byte
	if err := row.Scan(&entry.ID, &entry.Action, &entry.Status, &entry.Method, &entry.Path,
		&entry.RequestID, &entry.ResourceType, &resourceID, &entry.Message, &metadata,
		&entry.IPAddress, &entry.UserAgent, &entry.CreatedAt); err != nil {
		return nil, err
	}
	if resourceID.Valid {
		entry.ResourceID = resourceID.Int64
	}
	if len(metadata) > 0 && string(metadata) != "null" {
		if err := json.Unmarshal(metadata, &entry.Metadata); err != nil {
			return nil, fmt.Errorf("failed decoding activity metadata: %w", err)
		}
	}
	return &entry, nil
}

// nullableID converts zero ids into SQL NULL for optional foreign keys.
func nullableID(id int64) interface{} {
	if id <= 0 {
		return nil
	}
	return id
}

// nullableText converts empty details into SQL NULL to keep history compact.
func nullableText(value string) interface{} {
	if value == "" {
		return nil
	}
	return value
}
