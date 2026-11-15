package routes

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/models"
)

type activityRecorderStub struct {
	entries []models.ActivityLogInput
}

// Record stores request activity in memory for middleware assertions.
func (s *activityRecorderStub) Record(_ context.Context, input models.ActivityLogInput) {
	s.entries = append(s.entries, input)
}

// ListForUser returns no entries because request logging only needs the recorder contract.
func (s *activityRecorderStub) ListForUser(context.Context, int64, int, int) ([]models.ActivityLog, error) {
	return nil, nil
}

// TestLoggingMiddlewarePersistsResponseOutcome verifies status, request id, and actor context.
func TestLoggingMiddlewarePersistsResponseOutcome(t *testing.T) {
	activity := &activityRecorderStub{}
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		middleware.SetRequestUserID(r.Context(), 42)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"bad capture"}`))
	})
	handler := loggingMiddleware(next, activity)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tours/captures", nil)
	req.RemoteAddr = "192.0.2.1:1234"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if len(activity.entries) != 1 {
		t.Fatalf("expected one request activity, got %d", len(activity.entries))
	}
	entry := activity.entries[0]
	if entry.Status != "warning" || entry.UserID != 42 || entry.RequestID == "" || entry.Details == "" {
		t.Fatalf("unexpected request activity: %+v", entry)
	}
}
