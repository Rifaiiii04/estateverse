package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// AccountRepository persists account changes made by the seller: profile, password, deletion, and reset tokens.
type AccountRepository interface {
	UpdateName(ctx context.Context, userID int64, name string) error
	UpdatePassword(ctx context.Context, userID int64, passwordHash, keepSessionHash string) error
	DeleteUser(ctx context.Context, userID int64) error
	CreatePasswordReset(ctx context.Context, userID int64, tokenHash string, expiresAt time.Time) error
	LatestPasswordResetAt(ctx context.Context, userID int64) (time.Time, bool, error)
	RedeemPasswordReset(ctx context.Context, tokenHash, passwordHash string, now time.Time) error
}

type mysqlAccountRepo struct {
	db *sql.DB
}

// NewAccountRepository instantiates a MySQL account repository.
func NewAccountRepository(db *sql.DB) AccountRepository {
	return &mysqlAccountRepo{db: db}
}

// UpdateName changes the display name of a user.
func (r *mysqlAccountRepo) UpdateName(ctx context.Context, userID int64, name string) error {
	res, err := r.db.ExecContext(ctx, `UPDATE users SET name = ? WHERE id = ?`, name, userID)
	if err != nil {
		return fmt.Errorf("failed updating name: %w", err)
	}
	return requireAffected(res)
}

// UpdatePassword stores a new password hash and signs out every other session of the user.
func (r *mysqlAccountRepo) UpdatePassword(ctx context.Context, userID int64, passwordHash, keepSessionHash string) error {
	return withTx(ctx, r.db, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `UPDATE users SET password_hash = ? WHERE id = ?`, passwordHash, userID)
		if err != nil {
			return fmt.Errorf("failed updating password: %w", err)
		}
		if err := requireAffected(res); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?`, userID, keepSessionHash)
		return err
	})
}

// DeleteUser removes a user; sessions, listings, leads, and reset tokens cascade through foreign keys.
func (r *mysqlAccountRepo) DeleteUser(ctx context.Context, userID int64) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, userID)
	if err != nil {
		return fmt.Errorf("failed deleting user: %w", err)
	}
	return requireAffected(res)
}

// CreatePasswordReset stores a new reset token hash and invalidates the user's older unused tokens.
func (r *mysqlAccountRepo) CreatePasswordReset(ctx context.Context, userID int64, tokenHash string, expiresAt time.Time) error {
	return withTx(ctx, r.db, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL`, userID); err != nil {
			return fmt.Errorf("failed clearing old reset tokens: %w", err)
		}
		_, err := tx.ExecContext(ctx, `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
			userID, tokenHash, expiresAt)
		return err
	})
}

// LatestPasswordResetAt returns when the user last requested a reset, used to throttle reset emails.
func (r *mysqlAccountRepo) LatestPasswordResetAt(ctx context.Context, userID int64) (time.Time, bool, error) {
	var at sql.NullTime
	err := r.db.QueryRowContext(ctx, `SELECT MAX(created_at) FROM password_resets WHERE user_id = ?`, userID).Scan(&at)
	if err != nil {
		return time.Time{}, false, fmt.Errorf("failed reading reset history: %w", err)
	}
	return at.Time, at.Valid, nil
}

// RedeemPasswordReset consumes a valid unused token, sets the new password, and signs out all sessions atomically.
func (r *mysqlAccountRepo) RedeemPasswordReset(ctx context.Context, tokenHash, passwordHash string, now time.Time) error {
	return withTx(ctx, r.db, func(tx *sql.Tx) error {
		var userID int64
		err := tx.QueryRowContext(ctx, `SELECT user_id FROM password_resets
			WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? FOR UPDATE`, tokenHash, now).Scan(&userID)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("failed reading reset token: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `UPDATE password_resets SET used_at = ? WHERE token_hash = ?`, now, tokenHash); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE users SET password_hash = ? WHERE id = ?`, passwordHash, userID); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `DELETE FROM sessions WHERE user_id = ?`, userID)
		return err
	})
}
