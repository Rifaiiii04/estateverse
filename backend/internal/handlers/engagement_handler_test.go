package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// stubStats records reports in memory.
type stubStats struct {
	reports []string
}

// RecordView is unused by these tests.
func (s *stubStats) RecordView(context.Context, int64, string) error { return nil }

// PublicImpact is unused by these tests.
func (s *stubStats) PublicImpact(context.Context) (*models.ImpactStats, error) {
	return &models.ImpactStats{}, nil
}

// CreateReport remembers the stored reason.
func (s *stubStats) CreateReport(_ context.Context, _ int64, reason, _ string) error {
	s.reports = append(s.reports, reason)
	return nil
}

// stubProps returns one fixed property; other repository methods are never called here.
type stubProps struct {
	repositories.PropertyRepository
	prop *models.Property
}

// GetByID returns the stub property when the id matches.
func (p stubProps) GetByID(_ context.Context, id int64) (*models.Property, error) {
	if p.prop != nil && p.prop.ID == id {
		return p.prop, nil
	}
	return nil, nil
}

// postReport sends a JSON report request to the handler and returns the status code.
func postReport(h *EngagementHandler, body string) int {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/reports", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Report(rec, req)
	return rec.Code
}

// TestReportValidatesAndStores accepts valid reports on published listings and rejects everything else.
func TestReportValidatesAndStores(t *testing.T) {
	stats := &stubStats{}
	h := NewEngagementHandler(stats, stubProps{prop: &models.Property{ID: 7, Status: models.StatusPublished}})

	if code := postReport(h, `{"property_id":7,"reason":"scam","note":"minta transfer DP sebelum survei"}`); code != http.StatusCreated {
		t.Fatalf("valid report: got %d", code)
	}
	if code := postReport(h, `{"property_id":7,"reason":"hack"}`); code != http.StatusBadRequest {
		t.Fatalf("unknown reason: got %d", code)
	}
	if code := postReport(h, `{"property_id":7,"reason":"other","note":"`+strings.Repeat("x", 501)+`"}`); code != http.StatusBadRequest {
		t.Fatalf("too long note: got %d", code)
	}
	if code := postReport(h, `{"property_id":99,"reason":"sold"}`); code != http.StatusNotFound {
		t.Fatalf("unknown listing: got %d", code)
	}
	if len(stats.reports) != 1 || stats.reports[0] != "scam" {
		t.Fatalf("expected exactly one stored report, got %v", stats.reports)
	}
}

// countingStats counts recorded views.
type countingStats struct {
	stubStats
	views int
}

// RecordView counts one stored view.
func (s *countingStats) RecordView(context.Context, int64, string) error {
	s.views++
	return nil
}

// TestRecordEventSkipsOwnerVisits covers BUG-25: the seller opening their own listing is not a buyer view.
func TestRecordEventSkipsOwnerVisits(t *testing.T) {
	stats := &countingStats{}
	h := NewEngagementHandler(stats, stubProps{prop: &models.Property{ID: 7, OwnerID: 4, Status: models.StatusPublished}})
	send := func(user *models.User) int {
		handler := middleware.OptionalAuth(&dummyAuthService{user: user})(http.HandlerFunc(h.RecordEvent))
		req := httptest.NewRequest(http.MethodPost, "/api/v1/events", strings.NewReader(`{"property_id":7,"kind":"detail"}`))
		req.Header.Set("Content-Type", "application/json")
		if user != nil {
			req.AddCookie(&http.Cookie{Name: "session_token", Value: "dummy_token_123"})
		}
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}
	if code := send(&models.User{ID: 4}); code != http.StatusOK || stats.views != 0 {
		t.Fatalf("owner visit: code %d, views %d", code, stats.views)
	}
	if code := send(nil); code != http.StatusCreated || stats.views != 1 {
		t.Fatalf("anonymous visit: code %d, views %d", code, stats.views)
	}
	if code := send(&models.User{ID: 9}); code != http.StatusCreated || stats.views != 2 {
		t.Fatalf("other signed-in buyer: code %d, views %d", code, stats.views)
	}
}

// TestUnauthorizedUsesStandardEnvelope covers BUG-20: 401 from the auth middleware matches other API errors.
func TestUnauthorizedUsesStandardEnvelope(t *testing.T) {
	handler := middleware.RequireAuth(&dummyAuthService{})(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil))
	if rec.Code != http.StatusUnauthorized || !strings.HasPrefix(rec.Header().Get("Content-Type"), "application/json") ||
		!strings.Contains(rec.Body.String(), `"success":false`) {
		t.Fatalf("got %d %q %s", rec.Code, rec.Header().Get("Content-Type"), rec.Body.String())
	}
}
