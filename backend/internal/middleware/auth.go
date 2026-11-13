package middleware

import (
	"context"
	"net/http"
	"strings"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/services"
)

type contextKey string

const userContextKey = contextKey("estateverse_auth_user")

// RequireAuth enforces a valid session token on incoming protected HTTP requests.
func RequireAuth(authSvc services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractToken(r)
			if token == "" {
				http.Error(w, `{"error":"unauthorized: session token missing"}`, http.StatusUnauthorized)
				return
			}

			user, err := authSvc.ValidateSession(r.Context(), token)
			if err != nil || user == nil {
				http.Error(w, `{"error":"unauthorized: invalid or expired session"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserFromContext retrieves the authenticated User entity from the request context.
func UserFromContext(ctx context.Context) *models.User {
	u, ok := ctx.Value(userContextKey).(*models.User)
	if !ok {
		return nil
	}
	return u
}

// extractToken reads the raw session token from HttpOnly cookie or Authorization header.
func extractToken(r *http.Request) string {
	cookie, err := r.Cookie("session_token")
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}

	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}

	return ""
}
