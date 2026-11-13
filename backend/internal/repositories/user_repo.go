package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"projectfai/backend/internal/models"
)

// UserRepository defines persistence operations for user accounts.
type UserRepository interface {
	Create(ctx context.Context, u *models.User) error
	GetByID(ctx context.Context, id int64) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
}

type mysqlUserRepo struct {
	db *sql.DB
}

// NewUserRepository instantiates a MySQL user repository.
func NewUserRepository(db *sql.DB) UserRepository {
	return &mysqlUserRepo{db: db}
}

// Create inserts a new user record into the database.
func (r *mysqlUserRepo) Create(ctx context.Context, u *models.User) error {
	query := `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`
	res, err := r.db.ExecContext(ctx, query, u.Name, u.Email, u.PasswordHash, u.Role)
	if isDuplicateKeyError(err) {
		return ErrDuplicate
	}
	if err != nil {
		return fmt.Errorf("failed to insert user: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	u.ID = id
	return nil
}

// GetByID retrieves a user record matching the given primary key.
func (r *mysqlUserRepo) GetByID(ctx context.Context, id int64) (*models.User, error) {
	query := `SELECT id, name, email, password_hash, role, created_at, updated_at FROM users WHERE id = ?`
	row := r.db.QueryRowContext(ctx, query, id)
	return scanUser(row)
}

// GetByEmail retrieves a user record matching the given email address.
func (r *mysqlUserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, name, email, password_hash, role, created_at, updated_at FROM users WHERE email = ?`
	row := r.db.QueryRowContext(ctx, query, email)
	return scanUser(row)
}

// scanUser parses a single SQL row into a User entity.
func scanUser(row *sql.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to scan user: %w", err)
	}
	return &u, nil
}
