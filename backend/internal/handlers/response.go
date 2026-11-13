package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"projectfai/backend/internal/httpx"
	"projectfai/backend/internal/services"
)

const internalErrorMessage = "internal server error"

// WriteJSON sends a successful JSON response with HTTP status code.
func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	httpx.WriteJSON(w, status, data)
}

// WriteError sends an error JSON response with appropriate status code.
func WriteError(w http.ResponseWriter, status int, message string) {
	httpx.WriteError(w, status, message)
}

// writeServiceError maps service errors to safe HTTP responses and logs unexpected failures.
func writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	if ve, ok := services.IsValidationError(err); ok {
		WriteError(w, http.StatusUnprocessableEntity, ve.Message)
		return
	}

	switch {
	case errors.Is(err, services.ErrNotFound):
		WriteError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, services.ErrConflict):
		WriteError(w, http.StatusConflict, "email is already registered")
	case errors.Is(err, services.ErrInvalidCredentials):
		WriteError(w, http.StatusUnauthorized, services.ErrInvalidCredentials.Error())
	case errors.Is(err, services.ErrUnauthenticated):
		WriteError(w, http.StatusUnauthorized, "not authenticated")
	default:
		slog.Error("unhandled service error", "method", r.Method, "path", r.URL.Path, "error", err)
		WriteError(w, http.StatusInternalServerError, internalErrorMessage)
	}
}
