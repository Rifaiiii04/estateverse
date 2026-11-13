package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"projectfai/backend/internal/models"
)

// SessionRepository defines persistence operations for user sessions.
type SessionRepository interface {
	Create(ctx context.Context, s *models.Session) error
	GetActiveUser(ctx context.Context, tokenHash string, now time.Time) (*models.User, error)
	DeleteByTokenHash(ctx context.Context, tokenHash string) error
	DeleteExpired(ctx context.Context, now time.Time) (int64, error)
}

type mysqlSessionRepo struct {
	db *sql.DB
}

// NewSessionRepository instantiates a MySQL session repository.
func NewSessionRepository(db *sql.DB) SessionRepository {
	return &mysqlSessionRepo{db: db}
}

// Create stores a new session with hashed token and expiry.
func (r *mysqlSessionRepo) Create(ctx context.Context, s *models.Session) error {
	query := `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`
	res, err := r.db.ExecContext(ctx, query, s.UserID, s.TokenHash, s.ExpiresAt)
	if err != nil {
		return fmt.Errorf("failed to insert session: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	s.ID = id
	return nil
}

// GetActiveUser resolves the user owning an unexpired session in a single indexed query.
func (r *mysqlSessionRepo) GetActiveUser(ctx context.Context, tokenHash string, now time.Time) (*models.User, error) {
	query := `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.created_at, u.updated_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = ? AND s.expires_at > ?
		LIMIT 1`

	var u models.User
	err := r.db.QueryRowContext(ctx, query, tokenHash, now).Scan(
		&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to resolve session user: %w", err)
	}
	return &u, nil
}

// DeleteByTokenHash removes a session matching the provided hashed token.
func (r *mysqlSessionRepo) DeleteByTokenHash(ctx context.Context, tokenHash string) error {
	query := `DELETE FROM sessions WHERE token_hash = ?`
	_, err := r.db.ExecContext(ctx, query, tokenHash)
	return err
}

// DeleteExpired purges outdated sessions and returns the number of removed rows.
func (r *mysqlSessionRepo) DeleteExpired(ctx context.Context, now time.Time) (int64, error) {
	query := `DELETE FROM sessions WHERE expires_at <= ?`
	res, err := r.db.ExecContext(ctx, query, now)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
