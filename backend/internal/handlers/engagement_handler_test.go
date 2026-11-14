package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

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
