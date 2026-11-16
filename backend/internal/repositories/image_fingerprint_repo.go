package repositories

import (
	"context"
	"database/sql"
	"time"
)

const (
	// maxPhotoHashDistance is the Hamming distance under which two dHashes count as the same photo.
	maxPhotoHashDistance = 5
	// minHashBits and maxHashBits skip near-uniform photos (blank walls, solid colours) that collide by chance.
	minHashBits = 6
	maxHashBits = 58
)

// FingerprintCandidate is a listing photo that has no perceptual hash yet.
type FingerprintCandidate struct {
	FilePath   string
	OwnerID    int64
	UploadedAt time.Time
}

// ImageFingerprintRepository stores perceptual hashes of listing photos and finds reuse across sellers.
type ImageFingerprintRepository interface {
	Save(ctx context.Context, filePath string, ownerID int64, hash uint64, uploadedAt time.Time) error
	ListMissing(ctx context.Context, limit int) ([]FingerprintCandidate, error)
	CountBorrowed(ctx context.Context, propertyID, ownerID int64) (int, error)
}

type mysqlImageFingerprintRepo struct {
	db *sql.DB
}

// NewImageFingerprintRepository instantiates a MySQL-backed fingerprint repository.
func NewImageFingerprintRepository(db *sql.DB) ImageFingerprintRepository {
	return &mysqlImageFingerprintRepo{db: db}
}

// Save records a photo's hash once; the first upload of a file path keeps its original time.
func (r *mysqlImageFingerprintRepo) Save(ctx context.Context, filePath string, ownerID int64, hash uint64,
	uploadedAt time.Time) error {
	_, err := r.db.ExecContext(ctx, `INSERT IGNORE INTO image_fingerprints (file_path, owner_id, dhash, created_at)
		VALUES (?, ?, ?, ?)`, filePath, ownerID, hash, uploadedAt)
	return err
}

// ListMissing returns listing photos uploaded before fingerprinting existed, oldest first.
func (r *mysqlImageFingerprintRepo) ListMissing(ctx context.Context, limit int) ([]FingerprintCandidate, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT pi.file_path, p.owner_id, MIN(pi.created_at)
		FROM property_images pi
		JOIN properties p ON p.id = pi.property_id
		LEFT JOIN image_fingerprints f ON f.file_path = pi.file_path
		WHERE f.file_path IS NULL
		GROUP BY pi.file_path, p.owner_id
		ORDER BY MIN(pi.created_at)
		LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []FingerprintCandidate
	for rows.Next() {
		var c FingerprintCandidate
		if err := rows.Scan(&c.FilePath, &c.OwnerID, &c.UploadedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

// CountBorrowed counts a property's photos that match a photo another seller uploaded earlier.
func (r *mysqlImageFingerprintRepo) CountBorrowed(ctx context.Context, propertyID, ownerID int64) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT pi.id)
		FROM property_images pi
		JOIN image_fingerprints mine ON mine.file_path = pi.file_path
		WHERE pi.property_id = ?
		  AND BIT_COUNT(mine.dhash) BETWEEN ? AND ?
		  AND EXISTS (
			SELECT 1 FROM image_fingerprints other
			WHERE other.owner_id <> ?
			  AND other.created_at < mine.created_at
			  AND BIT_COUNT(other.dhash ^ mine.dhash) <= ?
		  )`, propertyID, minHashBits, maxHashBits, ownerID, maxPhotoHashDistance).Scan(&count)
	return count, err
}
