package handlers

import (
	"net/http"
	"strings"

	"projectfai/backend/internal/httpx"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/services"
)

// resetRequestedMessage is returned whether or not the email exists, so the endpoint cannot be used to find accounts.
const resetRequestedMessage = "Jika email terdaftar, tautan reset password sudah dikirim. Periksa kotak masuk atau folder spam."

// AccountHandler exposes account settings and password reset endpoints.
type AccountHandler struct {
	accounts services.AccountService
	auth     *AuthHandler
}

// NewAccountHandler constructs an AccountHandler; auth is used to clear the session cookie after deletion.
func NewAccountHandler(accounts services.AccountService, auth *AuthHandler) *AccountHandler {
	return &AccountHandler{accounts: accounts, auth: auth}
}

// UpdateProfile changes the signed-in seller's display name.
func (h *AccountHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var in models.UpdateProfileInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	user, err := h.accounts.UpdateName(r.Context(), currentUserID(r), in.Name)
	respond(w, r, http.StatusOK, user, err)
}

// ChangePassword replaces the password after checking the current one; other devices are signed out.
func (h *AccountHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var in models.ChangePasswordInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	err := h.accounts.ChangePassword(r.Context(), currentUserID(r), sessionToken(r), in)
	respond(w, r, http.StatusOK, map[string]string{"message": "Password berhasil diubah."}, err)
}

// DeleteAccount removes the seller, their listings and files, then clears the session cookie.
func (h *AccountHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	var in models.DeleteAccountInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	if err := h.accounts.DeleteAccount(r.Context(), currentUserID(r), in.Password); err != nil {
		writeServiceError(w, r, err)
		return
	}
	h.auth.clearSessionCookie(w)
	WriteJSON(w, http.StatusOK, map[string]string{"message": "Akun dan semua iklan sudah dihapus."})
}

// ForgotPassword starts a reset and always answers with the same message.
func (h *AccountHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var in models.ForgotPasswordInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	if err := h.accounts.RequestPasswordReset(r.Context(), in.Email); err != nil {
		logServiceError(r, err) // still answer generically so failures do not reveal registered emails
	}
	WriteJSON(w, http.StatusOK, map[string]string{"message": resetRequestedMessage})
}

// ResetPassword redeems a reset link for a new password.
func (h *AccountHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var in models.ResetPasswordInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	err := h.accounts.ResetPassword(r.Context(), in)
	respond(w, r, http.StatusOK, map[string]string{"message": "Password baru tersimpan. Silakan masuk."}, err)
}

// sessionToken reads the raw session token of an authenticated request (cookie first, then bearer header).
func sessionToken(r *http.Request) string {
	if c, err := r.Cookie("session_token"); err == nil && c.Value != "" {
		return c.Value
	}
	token, _ := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	return token
}
