package services

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// stubRefs reports a fixed set of referenced storage URLs.
type stubRefs struct {
	refs map[string]bool
}

// IsReferenced reports whether the URL is in the fixed set.
func (s stubRefs) IsReferenced(_ context.Context, urlPath string) (bool, error) {
	return s.refs[urlPath], nil
}

// ListReferenced returns the fixed set.
func (s stubRefs) ListReferenced(context.Context) (map[string]bool, error) {
	return s.refs, nil
}

// writeUpload creates a stored file and returns its public URL.
func writeUpload(t *testing.T, storage StorageService, rel string, age time.Duration) string {
	t.Helper()
	if err := storage.WriteFile(rel, []byte("x")); err != nil {
		t.Fatal(err)
	}
	abs, _ := storage.GetAbsolutePath(rel)
	old := time.Now().Add(-age)
	_ = os.Chtimes(abs, old, old)
	return storageURLPrefix + filepath.ToSlash(rel)
}

// TestReleaseKeepsSharedFiles deletes a deleted listing's photo but never one another listing still uses.
func TestReleaseKeepsSharedFiles(t *testing.T) {
	storage := NewStorageService(t.TempDir(), 1<<20)
	own := writeUpload(t, storage, "images/own.jpg", 0)
	shared := writeUpload(t, storage, "images/shared.jpg", 0)
	j := NewMediaJanitor(stubRefs{refs: map[string]bool{shared: true}}, storage)

	j.Release(context.Background(), []string{own, shared, "/api/v1/storage/images", "https://example.com/x.jpg"})

	if !j.IsMissing(own) {
		t.Fatal("unreferenced photo of a deleted listing is still served")
	}
	if j.IsMissing(shared) {
		t.Fatal("photo still referenced by another listing was deleted")
	}
}

// TestSweepRemovesOnlyOldOrphans keeps fresh uploads (a form still being filled) and referenced files.
func TestSweepRemovesOnlyOldOrphans(t *testing.T) {
	storage := NewStorageService(t.TempDir(), 1<<20)
	oldOrphan := writeUpload(t, storage, "images/old.jpg", 48*time.Hour)
	fresh := writeUpload(t, storage, "images/fresh.jpg", time.Hour)
	used := writeUpload(t, storage, "panoramas/used.jpg", 48*time.Hour)
	j := NewMediaJanitor(stubRefs{refs: map[string]bool{used: true}}, storage).(*mediaJanitor)

	j.sweep(context.Background())

	if !j.IsMissing(oldOrphan) || j.IsMissing(fresh) || j.IsMissing(used) {
		t.Fatalf("sweep result wrong: old missing=%t fresh missing=%t used missing=%t",
			j.IsMissing(oldOrphan), j.IsMissing(fresh), j.IsMissing(used))
	}
}

// TestSweepSkipsWhenNothingReferenced never wipes storage if the reference query looks empty.
func TestSweepSkipsWhenNothingReferenced(t *testing.T) {
	storage := NewStorageService(t.TempDir(), 1<<20)
	file := writeUpload(t, storage, "images/old.jpg", 48*time.Hour)
	j := NewMediaJanitor(stubRefs{refs: map[string]bool{}}, storage).(*mediaJanitor)
	j.sweep(context.Background())
	if j.IsMissing(file) {
		t.Fatal("sweep deleted files although no references were loaded")
	}
}
