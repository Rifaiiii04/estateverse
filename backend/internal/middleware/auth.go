package middleware

import (
	"context"
	"net/http"
	"strings"

	"projectfai/backend/internal/httpx"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/services"
)

type contextKey string

const (
	userContextKey      = contextKey("estateverse_auth_user")
	requestIDContextKey = contextKey("estateverse_request_id")
)

type requestTrace struct {
	id     string
	userID int64
}

// RequireAuth enforces a valid session token on incoming protected HTTP requests.
func RequireAuth(authSvc services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractToken(r)
			if token == "" {
				httpx.WriteError(w, http.StatusUnauthorized, "unauthorized: session token missing")
				return
			}

			user, err := authSvc.ValidateSession(r.Context(), token)
			if err != nil || user == nil {
				httpx.WriteError(w, http.StatusUnauthorized, "unauthorized: invalid or expired session")
				return
			}

			SetRequestUserID(r.Context(), user.ID)
			ctx := context.WithValue(r.Context(), userContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth attaches the signed-in user when a valid session is present and lets anonymous requests through.
func OptionalAuth(authSvc services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractToken(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}
			user, err := authSvc.ValidateSession(r.Context(), token)
			if err != nil || user == nil {
				next.ServeHTTP(w, r)
				return
			}
			SetRequestUserID(r.Context(), user.ID)
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userContextKey, user)))
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

// WithRequestID attaches the trace id used by request and background activity records.
func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDContextKey, &requestTrace{id: requestID})
}

// RequestID retrieves the trace id assigned by the HTTP activity middleware.
func RequestID(ctx context.Context) string {
	trace, _ := ctx.Value(requestIDContextKey).(*requestTrace)
	if trace == nil {
		return ""
	}
	return trace.id
}

// SetRequestUserID associates the authenticated actor with the current request trace.
func SetRequestUserID(ctx context.Context, userID int64) {
	trace, _ := ctx.Value(requestIDContextKey).(*requestTrace)
	if trace != nil {
		trace.userID = userID
	}
}

// RequestUserID retrieves the authenticated actor from the current request trace.
func RequestUserID(ctx context.Context) int64 {
	trace, _ := ctx.Value(requestIDContextKey).(*requestTrace)
	if trace == nil {
		return 0
	}
	return trace.userID
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
