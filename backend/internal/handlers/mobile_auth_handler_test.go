package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"projectfai/backend/internal/models"
)

// TestMobileLoginUsesServerSession verifies native sessions use the existing authentication service without weakening web cookies.
func TestMobileLoginUsesServerSession(t *testing.T) {
	h := NewAuthHandler(&dummyAuthService{user: &models.User{ID: 7, Name: "Seller", Role: "seller"}}, false)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/mobile/login", strings.NewReader(`{"email":"seller@example.com","password":"secret"}`))
	req.Header.Set("Content-Type", "application/json")
	h.LoginMobile(rec, req)
	var body struct {
		Data struct {
			Token string              `json:"token"`
			User  models.UserResponse `json:"user"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if rec.Code != http.StatusOK || body.Data.Token != "dummy_token_123" || body.Data.User.ID != 7 {
		t.Fatalf("unexpected mobile login response: %d %s", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("token response must not be cached")
	}
}

type logoutRecorder struct {
	*dummyAuthService
	revoked string
}

// Logout records the bearer session revoked through the shared logout endpoint.
func (s *logoutRecorder) Logout(_ context.Context, token string) error { s.revoked = token; return nil }

// TestMobileLogoutRevokesBearer ensures clearing native storage also invalidates the actual server session.
func TestMobileLogoutRevokesBearer(t *testing.T) {
	svc := &logoutRecorder{dummyAuthService: &dummyAuthService{}}
	h := NewAuthHandler(svc, false)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer native-session")
	rec := httptest.NewRecorder()
	h.Logout(rec, req)
	if rec.Code != http.StatusOK || svc.revoked != "native-session" {
		t.Fatal("native server session was not revoked")
	}
}
