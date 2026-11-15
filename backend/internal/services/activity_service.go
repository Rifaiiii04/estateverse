package services

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// ActivityService records backend activity and exposes owner-scoped history.
type ActivityService interface {
	Record(ctx context.Context, input models.ActivityLogInput)
	ListForUser(ctx context.Context, userID int64, limit, offset int) ([]models.ActivityLog, error)
}

// NewActivityService creates the database-backed activity recorder.
func NewActivityService(repo repositories.ActivityLogRepository) ActivityService {
	return &activityService{repo: repo}
}

type activityService struct {
	repo repositories.ActivityLogRepository
}

// Record writes a structured console event and persists it with a short independent timeout.
func (s *activityService) Record(_ context.Context, input models.ActivityLogInput) {
	started := time.Now()
	logActivity(input)
	if s.repo == nil {
		return
	}
	persistCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := s.repo.Create(persistCtx, input); err != nil {
		slog.Error("failed persisting activity history", "action", input.Action, "error", err)
		return
	}
	slog.Debug("activity history persisted", "action", input.Action, "duration", time.Since(started).Round(time.Millisecond))
}

// ListForUser returns history records for the authenticated seller.
func (s *activityService) ListForUser(ctx context.Context, userID int64, limit, offset int) ([]models.ActivityLog, error) {
	if s.repo == nil {
		return nil, errors.New("activity history is unavailable")
	}
	return s.repo.ListForUser(ctx, userID, limit, offset)
}

// logActivity emits one readable structured console record for every activity.
func logActivity(input models.ActivityLogInput) {
	level := slog.LevelInfo
	if input.Status == "error" {
		level = slog.LevelError
	} else if input.Status == "warning" {
		level = slog.LevelWarn
	}
	slog.Log(context.Background(), level, input.Message,
		"action", input.Action,
		"status", input.Status,
		"user_id", input.UserID,
		"request_id", input.RequestID,
		"resource_type", input.ResourceType,
		"resource_id", input.ResourceID,
		"method", input.Method,
		"path", input.Path,
		"details", input.Details)
}
