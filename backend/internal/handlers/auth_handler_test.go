package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/models"
)

type dummyAuthService struct {
	user *models.User
}

func (d *dummyAuthService) Register(ctx context.Context, input models.RegisterInput) (*models.UserResponse, error) {
	res := d.user.ToResponse()
	return &res, nil
}

func (d *dummyAuthService) Login(ctx context.Context, input models.LoginInput) (*models.UserResponse, string, time.Time, error) {
	res := d.user.ToResponse()
	return &res, "dummy_token_123", time.Now().Add(24 * time.Hour), nil
}

func (d *dummyAuthService) ValidateSession(ctx context.Context, token string) (*models.User, error) {
	if token == "dummy_token_123" {
		return d.user, nil
	}
	return nil, http.ErrNoCookie
}

func (d *dummyAuthService) Logout(ctx context.Context, token string) error {
	return nil
}

func (d *dummyAuthService) PurgeExpiredSessions(ctx context.Context) (int64, error) {
	return 0, nil
}

// TestAuthHandler_LoginSetsCookie verifies login response and HttpOnly cookie issuance.
func TestAuthHandler_LoginSetsCookie(t *testing.T) {
	dummyUser := &models.User{
		ID:    1,
		Name:  "Test Seller",
		Email: "seller@estateverse.com",
		Role:  "seller",
	}
	authSvc := &dummyAuthService{user: dummyUser}
	handler := NewAuthHandler(authSvc, false)

	body, _ := json.Marshal(models.LoginInput{
		Email:    "seller@estateverse.com",
		Password: "Password123!",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.Login(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	cookies := rec.Result().Cookies()
	var foundSessionCookie bool
	for _, c := range cookies {
		if c.Name == "session_token" && c.Value == "dummy_token_123" && c.HttpOnly {
			foundSessionCookie = true
		}
	}
	if !foundSessionCookie {
		t.Errorf("expected HttpOnly session_token cookie to be set")
	}
}

// TestMiddleware_RequireAuthRejectsAnonymous verifies anonymous requests are rejected with 401.
func TestMiddleware_RequireAuthRejectsAnonymous(t *testing.T) {
	dummyUser := &models.User{ID: 1, Name: "Test Seller", Email: "seller@test.com", Role: "seller"}
	authSvc := &dummyAuthService{user: dummyUser}

	protectedHandler := middleware.RequireAuth(authSvc)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	rec := httptest.NewRecorder()

	protectedHandler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 Unauthorized for anonymous user, got %d", rec.Code)
	}
}
