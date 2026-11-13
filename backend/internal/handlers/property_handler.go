package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"projectfai/backend/internal/httpx"
	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/services"
)

// PropertyHandler handles HTTP requests for property listings.
type PropertyHandler struct {
	propSvc services.PropertyService
}

// NewPropertyHandler instantiates a property HTTP handler.
func NewPropertyHandler(propSvc services.PropertyService) *PropertyHandler {
	return &PropertyHandler{propSvc: propSvc}
}

// ListPublic returns a paginated list of published properties.
func (h *PropertyHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	props, total, err := h.propSvc.ListPublicProperties(r.Context(), page, limit)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"properties": props,
		"total":      total,
		"page":       page,
	})
}

// GetPublic retrieves a single published property by its slug.
func (h *PropertyHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	slug := extractPathTail(r.URL.Path, "/api/v1/properties/")
	if slug == "" {
		WriteError(w, http.StatusBadRequest, "property slug is required")
		return
	}

	prop, err := h.propSvc.GetPublicProperty(r.Context(), slug)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	WriteJSON(w, http.StatusOK, prop)
}

// ListDashboard retrieves all properties belonging to the authenticated seller.
func (h *PropertyHandler) ListDashboard(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	props, err := h.propSvc.ListOwnerProperties(r.Context(), user.ID)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	WriteJSON(w, http.StatusOK, props)
}

// GetDashboardSummary returns counter statistics for the seller dashboard.
func (h *PropertyHandler) GetDashboardSummary(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	summary, err := h.propSvc.GetDashboardSummary(r.Context(), user.ID)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	WriteJSON(w, http.StatusOK, summary)
}

// Create handles creation of a new property listing.
func (h *PropertyHandler) Create(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var in models.PropertyInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}

	prop, err := h.propSvc.CreateProperty(r.Context(), user.ID, in)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	WriteJSON(w, http.StatusCreated, prop)
}

// GetOwnerProperty retrieves a specific property by ID for editing.
func (h *PropertyHandler) GetOwnerProperty(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	idStr := extractPathTail(r.URL.Path, "/api/v1/dashboard/properties/")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		WriteError(w, http.StatusBadRequest, "invalid property id")
		return
	}

	prop, err := h.propSvc.GetOwnerProperty(r.Context(), id, user.ID)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	WriteJSON(w, http.StatusOK, prop)
}

// Update modifies an existing property owned by the seller.
func (h *PropertyHandler) Update(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	idStr := extractPathTail(r.URL.Path, "/api/v1/properties/")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		WriteError(w, http.StatusBadRequest, "invalid property id")
		return
	}

	var in models.PropertyInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}

	prop, err := h.propSvc.UpdateProperty(r.Context(), id, user.ID, in)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}

	WriteJSON(w, http.StatusOK, prop)
}

// Delete permanently removes a property owned by the seller.
func (h *PropertyHandler) Delete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	idStr := extractPathTail(r.URL.Path, "/api/v1/properties/")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		WriteError(w, http.StatusBadRequest, "invalid property id")
		return
	}

	if err := h.propSvc.DeleteProperty(r.Context(), id, user.ID); err != nil {
		writeServiceError(w, r, err)
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"message": "property deleted successfully"})
}

// extractPathTail strips prefix from URL path returning the remaining tail identifier.
func extractPathTail(path, prefix string) string {
	tail := strings.TrimPrefix(path, prefix)
	return strings.Trim(tail, "/")
}
