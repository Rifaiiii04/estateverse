package repositories

import (
	"bytes"
	"context"
	"database/sql"
	"errors"

	"projectfai/backend/internal/models"
)

// AcceptCapture serializes submissions per owned property and exposes a new room only after its inputs exist.
func (r *mysqlTourRepo) AcceptCapture(ctx context.Context, ownerID int64, room *models.TourRoom, key string,
	digest []byte, store func(int64) error) (bool, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return false, err
	}
	defer tx.Rollback()
	var propertyID int64
	err = tx.QueryRowContext(ctx, "SELECT id FROM properties WHERE id = ? AND owner_id = ? FOR UPDATE", room.PropertyID, ownerID).Scan(&propertyID)
	if errors.Is(err, sql.ErrNoRows) {
		return false, ErrNotFound
	}
	if err != nil {
		return false, err
	}
	existing, err := captureReceipt(ctx, tx, propertyID, key, digest)
	if err != nil {
		return false, err
	}
	if existing != nil {
		*room = *existing
		return false, nil
	}
	if err = insertTourRoom(ctx, tx, room, key, digest); err != nil {
		return false, err
	}
	if _, err = tx.ExecContext(ctx, "UPDATE properties SET status = 'draft' WHERE id = ? AND status = 'published'", propertyID); err != nil {
		return false, err
	}
	if err = store(room.ID); err != nil {
		return false, err
	}
	// The files already exist if the client loses the database's acknowledgement.
	return true, tx.Commit()
}

// captureReceipt retrieves the original result and detects accidental reuse for different images.
func captureReceipt(ctx context.Context, tx *sql.Tx, propertyID int64, key string, digest []byte) (*models.TourRoom, error) {
	var id int64
	var stored []byte
	err := tx.QueryRowContext(ctx, "SELECT id, capture_digest FROM property_tour_rooms WHERE property_id = ? AND capture_id = ? FOR UPDATE", propertyID, key).Scan(&id, &stored)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if !bytes.Equal(digest, stored) {
		return nil, ErrDuplicate
	}
	return scanTourRoom(tx.QueryRowContext(ctx, "SELECT "+tourRoomColumns+" FROM property_tour_rooms WHERE id = ?", id))
}
