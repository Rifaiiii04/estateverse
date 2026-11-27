package services

import (
	"context"
	"log/slog"
	"os"
	"path"
	"strings"
	"time"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

const (
	// orphanUploadGrace keeps fresh uploads for a day so a seller still filling the listing form keeps their photos.
	orphanUploadGrace = 24 * time.Hour
	orphanSweepEvery  = 6 * time.Hour
	firstSweepDelay   = 2 * time.Minute
)

var sweptCategories = []string{CategoryImages, CategoryModels, CategoryPanoramas}

// MediaJanitor deletes public uploads once no listing or tour room references them any more.
type MediaJanitor interface {
	Release(ctx context.Context, urlPaths []string)
	ReleaseRoom(ctx context.Context, room *models.TourRoom)
	IsMissing(urlPath string) bool
	Start(ctx context.Context)
}

type mediaJanitor struct {
	refs    repositories.MediaReferenceRepository
	storage StorageService
	now     func() time.Time
}

// NewMediaJanitor wires the reference lookup with local storage.
func NewMediaJanitor(refs repositories.MediaReferenceRepository, storage StorageService) MediaJanitor {
	return &mediaJanitor{refs: refs, storage: storage, now: time.Now}
}

// Release removes each file nothing references any more; files another listing still uses are kept.
func (j *mediaJanitor) Release(ctx context.Context, urlPaths []string) {
	for _, urlPath := range urlPaths {
		rel, ok := publicRelativePath(urlPath)
		if !ok {
			continue
		}
		if used, err := j.refs.IsReferenced(ctx, urlPath); err != nil || used {
			continue
		}
		if err := j.storage.DeleteFile(rel); err != nil {
			slog.Warn("failed deleting released media", "path", urlPath, "error", err)
		}
	}
}

// ReleaseRoom deletes a removed tour room's panoramas and any capture frames left from recording it.
func (j *mediaJanitor) ReleaseRoom(ctx context.Context, room *models.TourRoom) {
	j.Release(ctx, []string{room.PanoramaPath, room.PreviewPath})
	if err := j.storage.RemoveAll(captureDir(room.ID)); err != nil {
		slog.Warn("failed deleting capture frames", "room_id", room.ID, "error", err)
	}
}

// IsMissing reports whether a public storage URL no longer has a file behind it (deleted or quarantined).
func (j *mediaJanitor) IsMissing(urlPath string) bool {
	rel, ok := publicRelativePath(urlPath)
	if !ok {
		return false // not ours to judge (for example an external URL)
	}
	abs, err := j.storage.GetAbsolutePath(rel)
	if err != nil {
		return true
	}
	_, err = os.Stat(abs)
	return os.IsNotExist(err)
}

// Start periodically removes uploads that were never attached to a listing (for example a cancelled form).
func (j *mediaJanitor) Start(ctx context.Context) {
	go func() {
		timer := time.NewTimer(firstSweepDelay)
		defer timer.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-timer.C:
				j.sweep(ctx)
				timer.Reset(orphanSweepEvery)
			}
		}
	}()
}

// sweep deletes unreferenced uploads older than the grace period in every public category.
func (j *mediaJanitor) sweep(ctx context.Context) {
	refs, err := j.refs.ListReferenced(ctx)
	if err != nil {
		slog.Warn("orphan media sweep skipped", "error", err)
		return
	}
	if len(refs) == 0 {
		return // never wipe storage when the reference list looks empty
	}
	cutoff := j.now().Add(-orphanUploadGrace)
	removed := 0
	for _, category := range sweptCategories {
		removed += j.sweepCategory(category, refs, cutoff)
	}
	if removed > 0 {
		slog.Info("removed unreferenced uploads", "count", removed)
	}
}

// sweepCategory deletes the orphaned files of one storage folder and returns how many were removed.
func (j *mediaJanitor) sweepCategory(category string, refs map[string]bool, cutoff time.Time) int {
	dir, err := j.storage.GetAbsolutePath(category)
	if err != nil {
		return 0
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 0
	}
	removed := 0
	for _, entry := range entries {
		if !isOrphanUpload(entry, storageURLPrefix+category+"/"+entry.Name(), refs, cutoff) {
			continue
		}
		if j.storage.DeleteFile(path.Join(category, entry.Name())) == nil {
			removed++
		}
	}
	return removed
}

// isOrphanUpload reports whether a stored file is unreferenced and older than the grace cutoff.
func isOrphanUpload(entry os.DirEntry, urlPath string, refs map[string]bool, cutoff time.Time) bool {
	if entry.IsDir() || refs[urlPath] {
		return false
	}
	info, err := entry.Info()
	return err == nil && info.ModTime().Before(cutoff)
}

// publicRelativePath turns a /api/v1/storage/... URL into a storage-relative path inside a public category.
func publicRelativePath(urlPath string) (string, bool) {
	rel, found := strings.CutPrefix(urlPath, storageURLPrefix)
	if !found || !strings.Contains(rel, "/") || !IsPublicCategory(rel) {
		return "", false
	}
	return rel, true
}
