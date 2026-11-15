package handlers

import (
	"net/http"

	"projectfai/backend/internal/httpx"
	"projectfai/backend/internal/models"
)

// LoginMobile issues the same hashed server session as web login, returning its bearer token for native secure storage.
func (h *AuthHandler) LoginMobile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input models.LoginInput
	if err := httpx.DecodeJSON(w, r, &input); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	user, token, expires, err := h.authSvc.Login(r.Context(), input)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	h.recordActivity(r, "auth.mobile_login", user.ID, "Login mobile berhasil", "")
	WriteJSON(w, http.StatusOK, map[string]interface{}{"user": user, "token": token, "expires": expires})
}
