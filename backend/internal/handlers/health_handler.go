package handlers

import (
	"database/sql"
	"net/http"

	"projectfai/backend/internal/database"
)

// HealthHandler serves API and database connectivity diagnostics.
type HealthHandler struct {
	db *sql.DB
}

// NewHealthHandler creates a diagnostic handler.
func NewHealthHandler(db *sql.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// Check verifies system health and database ping status.
func (h *HealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	dbStatus := "connected"
	if err := database.HealthCheck(r.Context(), h.db); err != nil {
		dbStatus = "unavailable"
		WriteJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status":   "degraded",
			"database": dbStatus,
		})
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{
		"status":   "healthy",
		"database": dbStatus,
	})
}
