package handlers

import (
	"net/http"
	"time"

	"projectfai/backend/internal/httpx"
	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/services"
)

// AuthHandler handles HTTP requests for user authentication and sessions.
type AuthHandler struct {
	authSvc      services.AuthService
	isProduction bool
}

// NewAuthHandler instantiates the authentication HTTP handler.
func NewAuthHandler(authSvc services.AuthService, isProd bool) *AuthHandler {
	return &AuthHandler{
		authSvc:      authSvc,
		isProduction: isProd,
	}
}

// Register processes seller registration requests.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var input models.RegisterInput
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}

	user, err := h.authSvc.Register(r.Context(), input)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	WriteJSON(w, http.StatusCreated, user)
}

// Login verifies credentials and issues an HttpOnly session cookie.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var input models.LoginInput
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}

	user, token, expiresAt, err := h.authSvc.Login(r.Context(), input)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	h.setSessionCookie(w, token, expiresAt)
	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"user":    user,
		"expires": expiresAt,
	})
}

// Logout invalidates the active server session and wipes the client cookie.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var token string
	if c, err := r.Cookie("session_token"); err == nil {
		token = c.Value
	}

	if token != "" {
		_ = h.authSvc.Logout(r.Context(), token)
	}

	h.clearSessionCookie(w)
	WriteJSON(w, http.StatusOK, map[string]string{"message": "logged out successfully"})
}

// Me returns the profile of the currently authenticated seller.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	user := middleware.UserFromContext(r.Context())
	if user == nil {
		WriteError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	WriteJSON(w, http.StatusOK, user.ToResponse())
}

// setSessionCookie attaches a secure HttpOnly cookie to the response.
func (h *AuthHandler) setSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	cookie := &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.isProduction,
	}
	http.SetCookie(w, cookie)
}

// clearSessionCookie instructs the browser to erase the session cookie immediately.
func (h *AuthHandler) clearSessionCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.isProduction,
	}
	http.SetCookie(w, cookie)
}
