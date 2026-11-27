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

// TestValidateLeadInputNormalizesWhatsApp checks that every way a buyer may write a number becomes a wa.me-ready 62… number.
func TestValidateLeadInputNormalizesWhatsApp(t *testing.T) {
	cases := map[string]string{
		"0822-8965-9204":     "6282289659204",
		"+62 822 8965 9204":  "6282289659204",
		"+62 0822-8965-9204": "6282289659204",
		"6282289659204":      "6282289659204",
		"82289659204":        "6282289659204",
		" (0822) 8965 9204 ": "6282289659204",
	}
	for raw, want := range cases {
		in := models.LeadInput{PropertyID: 1, Name: "Budi", Phone: raw}
		if msg := validateLeadInput(&in); msg != "" {
			t.Errorf("%q rejected: %s", raw, msg)
			continue
		}
		if in.Phone != want {
			t.Errorf("%q normalized to %q, want %q", raw, in.Phone, want)
		}
	}
}

// TestValidateLeadInputRejectsUnusableWhatsApp keeps numbers sellers cannot chat with out of the leads table.
func TestValidateLeadInputRejectsUnusableWhatsApp(t *testing.T) {
	for _, raw := range []string{"abc", "0812", "0000000000", "+62 0", "62123456789012345"} {
		in := models.LeadInput{PropertyID: 1, Name: "Budi", Phone: raw}
		if msg := validateLeadInput(&in); msg == "" {
			t.Errorf("%q accepted as %q", raw, in.Phone)
		}
	}
}

// stubLeadRepo owns lead 5 (owner 7) in status "contacted"; other ids do not exist for that owner.
type stubLeadRepo struct {
	repositories.LeadRepository
}

// UpdateStatus mimics the MySQL repository with found-rows semantics: same-value updates still match the row.
func (stubLeadRepo) UpdateStatus(_ context.Context, id, ownerID int64, _ string) error {
	if id == 5 && ownerID == 7 {
		return nil
	}
	return repositories.ErrNotFound
}

// patchLeadStatus sends an authenticated status update and returns the response code and body.
func patchLeadStatus(t *testing.T, id, body string) (int, string) {
	t.Helper()
	h := NewLeadHandler(stubLeadRepo{}, nil)
	auth := &dummyAuthService{user: &models.User{ID: 7, Role: "seller"}}
	handler := middleware.RequireAuth(auth)(http.HandlerFunc(h.UpdateLeadStatus))
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/owner/leads/"+id+"/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "session_token", Value: "dummy_token_123"})
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec.Code, rec.Body.String()
}

// TestUpdateLeadStatusMapsErrors covers BUG-22: same status is 200, unknown lead is 404, bad status is a clear 400.
func TestUpdateLeadStatusMapsErrors(t *testing.T) {
	if code, _ := patchLeadStatus(t, "5", `{"status":"contacted"}`); code != http.StatusOK {
		t.Fatalf("saving the same status: got %d, want 200", code)
	}
	if code, _ := patchLeadStatus(t, "999999", `{"status":"contacted"}`); code != http.StatusNotFound {
		t.Fatalf("unknown lead: got %d, want 404", code)
	}
	code, body := patchLeadStatus(t, "5", `{"status":"done"}`)
	if code != http.StatusBadRequest || !strings.Contains(body, "status tidak valid") {
		t.Fatalf("invalid status: got %d %s", code, body)
	}
}
