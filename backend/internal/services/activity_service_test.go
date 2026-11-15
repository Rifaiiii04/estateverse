package services

import (
	"context"
	"testing"

	"projectfai/backend/internal/models"
)

type activityRepoStub struct {
	entries []models.ActivityLogInput
}

// Create stores activity input in memory for service-level assertions.
func (s *activityRepoStub) Create(_ context.Context, input models.ActivityLogInput) error {
	s.entries = append(s.entries, input)
	return nil
}

// ListForUser returns an empty result because this test focuses on recording behavior.
func (s *activityRepoStub) ListForUser(context.Context, int64, int, int) ([]models.ActivityLog, error) {
	return []models.ActivityLog{}, nil
}

// TestActivityServiceRecordPersistsStructuredEntry verifies activity history input is retained.
func TestActivityServiceRecordPersistsStructuredEntry(t *testing.T) {
	repo := &activityRepoStub{}
	svc := NewActivityService(repo)

	svc.Record(context.Background(), models.ActivityLogInput{
		UserID:    7,
		Action:    "tour.stitch.failed",
		Status:    "error",
		RequestID: "request-1",
		Message:   "Panorama gagal diproses",
		Details:   "missing frame",
	})

	if len(repo.entries) != 1 {
		t.Fatalf("expected one activity entry, got %d", len(repo.entries))
	}
	entry := repo.entries[0]
	if entry.Action != "tour.stitch.failed" || entry.Status != "error" || entry.UserID != 7 {
		t.Fatalf("unexpected activity entry: %+v", entry)
	}
}
