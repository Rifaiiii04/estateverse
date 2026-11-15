package handlers

import (
	"net/http"
	"strconv"

	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/services"
)

const (
	defaultActivityLimit = 50
	maxActivityLimit     = 100
)

// ActivityHandler exposes authenticated owner activity history.
type ActivityHandler struct {
	activity services.ActivityService
}

// NewActivityHandler constructs an activity history handler.
func NewActivityHandler(activity services.ActivityService) *ActivityHandler {
	return &ActivityHandler{activity: activity}
}

// List returns the newest activity records for the authenticated seller.
func (h *ActivityHandler) List(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	limit, offset := activityPagination(r)
	logs, err := h.activity.ListForUser(r.Context(), user.ID, limit, offset)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"activities": logs,
		"limit":      limit,
		"offset":     offset,
	})
}

// activityPagination parses bounded history pagination parameters.
func activityPagination(r *http.Request) (int, int) {
	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil || limit <= 0 {
		limit = defaultActivityLimit
	}
	if limit > maxActivityLimit {
		limit = maxActivityLimit
	}
	offset, err := strconv.Atoi(r.URL.Query().Get("offset"))
	if err != nil || offset < 0 {
		offset = 0
	}
	return limit, offset
}
