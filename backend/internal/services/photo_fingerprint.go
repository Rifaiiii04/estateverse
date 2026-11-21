package services

import (
	"context"
	"log/slog"
	"os"
	"strings"
	"time"

	"projectfai/backend/internal/repositories"
)

const (
	storageURLPrefix      = "/api/v1/storage/"
	fingerprintBatchSize  = 50
	fingerprintBatchPause = 200 * time.Millisecond
)

// PhotoFingerprinter records listing-photo hashes and reports photos reused from another seller's earlier upload.
type PhotoFingerprinter interface {
	RecordUpload(ctx context.Context, ownerID int64, urlPath string)
	CountBorrowed(ctx context.Context, propertyID, ownerID int64) (int, error)
	StartBackfill(ctx context.Context)
}

type photoFingerprinter struct {
	repo    repositories.ImageFingerprintRepository
	storage StorageService
}

// NewPhotoFingerprinter wires the fingerprint repository with local storage to read uploaded files.
func NewPhotoFingerprinter(repo repositories.ImageFingerprintRepository, storage StorageService) PhotoFingerprinter {
	return &photoFingerprinter{repo: repo, storage: storage}
}

// RecordUpload hashes a freshly uploaded photo; failures are logged because fingerprints are a best-effort signal.
func (f *photoFingerprinter) RecordUpload(ctx context.Context, ownerID int64, urlPath string) {
	if err := f.record(ctx, ownerID, urlPath, time.Now()); err != nil {
		slog.Warn("photo fingerprint skipped", "path", urlPath, "error", err)
	}
}

// CountBorrowed returns how many of a property's photos match an earlier upload by another seller.
func (f *photoFingerprinter) CountBorrowed(ctx context.Context, propertyID, ownerID int64) (int, error) {
	return f.repo.CountBorrowed(ctx, propertyID, ownerID)
}

// StartBackfill hashes photos uploaded before fingerprinting existed, in small batches in the background.
func (f *photoFingerprinter) StartBackfill(ctx context.Context) {
	go func() {
		for ctx.Err() == nil {
			done, err := f.backfillBatch(ctx)
			if err != nil {
				slog.Warn("photo fingerprint backfill stopped", "error", err)
				return
			}
			if done {
				return
			}
			time.Sleep(fingerprintBatchPause)
		}
	}()
}

// backfillBatch fingerprints one batch of missing photos and reports whether nothing is left.
func (f *photoFingerprinter) backfillBatch(ctx context.Context) (bool, error) {
	missing, err := f.repo.ListMissing(ctx, fingerprintBatchSize)
	if err != nil || len(missing) == 0 {
		return true, err
	}
	for _, c := range missing {
		if err := f.record(ctx, c.OwnerID, c.FilePath, c.UploadedAt); err != nil {
			// Store an unmatchable hash so a missing or corrupt file is not retried forever.
			_ = f.repo.Save(ctx, c.FilePath, c.OwnerID, 0, c.UploadedAt)
		}
	}
	return len(missing) < fingerprintBatchSize, nil
}

// record reads a stored listing photo, hashes it, and saves the fingerprint with its upload time.
func (f *photoFingerprinter) record(ctx context.Context, ownerID int64, urlPath string, uploadedAt time.Time) error {
	abs, err := f.storage.GetAbsolutePath(strings.TrimPrefix(urlPath, storageURLPrefix))
	if err != nil {
		return err
	}
	file, err := os.Open(abs)
	if err != nil {
		return err
	}
	defer file.Close()
	hash, err := ComputeDHash(file)
	if err != nil {
		return err
	}
	return f.repo.Save(ctx, urlPath, ownerID, hash, uploadedAt)
}
