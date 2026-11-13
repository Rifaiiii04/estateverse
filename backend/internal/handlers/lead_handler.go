package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// LeadHandler exposes HTTP handlers for managing buyer leads and inquiries.
type LeadHandler struct {
	leadRepo repositories.LeadRepository
	propRepo repositories.PropertyRepository
}

// NewLeadHandler constructs a LeadHandler with required repositories.
func NewLeadHandler(leadRepo repositories.LeadRepository, propRepo repositories.PropertyRepository) *LeadHandler {
	return &LeadHandler{leadRepo: leadRepo, propRepo: propRepo}
}

// ListOwnerLeads retrieves all leads associated with properties owned by the authenticated seller.
func (h *LeadHandler) ListOwnerLeads(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		WriteError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	leads, err := h.leadRepo.ListByOwner(r.Context(), user.ID)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "failed fetching leads")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"leads": leads,
		"total": len(leads),
	})
}

// UpdateLeadStatus updates the pipeline progress state of a specific inquiry.
func (h *LeadHandler) UpdateLeadStatus(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		WriteError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	idStr := extractPathTail(r.URL.Path, "/api/v1/owner/leads/")
	idStr = strings.TrimSuffix(idStr, "/status")
	leadID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || leadID <= 0 {
		WriteError(w, http.StatusBadRequest, "invalid lead id")
		return
	}

	var payload struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Status == "" {
		WriteError(w, http.StatusBadRequest, "status is required")
		return
	}

	if err := h.leadRepo.UpdateStatus(r.Context(), leadID, user.ID, payload.Status); err != nil {
		WriteError(w, http.StatusInternalServerError, "failed updating lead status")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]interface{}{"status": payload.Status})
}

// CreateLead handles public inquiry submissions from prospective buyers.
func (h *LeadHandler) CreateLead(w http.ResponseWriter, r *http.Request) {
	var in models.LeadInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.PropertyID <= 0 || in.Name == "" || in.Phone == "" {
		WriteError(w, http.StatusBadRequest, "property_id, name, and phone are required")
		return
	}

	prop, err := h.propRepo.GetByID(r.Context(), in.PropertyID)
	if err != nil || prop == nil {
		WriteError(w, http.StatusNotFound, "target property not found")
		return
	}

	lead := &models.Lead{
		PropertyID: in.PropertyID,
		OwnerID:    prop.OwnerID,
		Name:       strings.TrimSpace(in.Name),
		Phone:      strings.TrimSpace(in.Phone),
		Budget:     strings.TrimSpace(in.Budget),
		Note:       strings.TrimSpace(in.Note),
		Status:     "new",
	}

	if err := h.leadRepo.Create(r.Context(), lead); err != nil {
		WriteError(w, http.StatusInternalServerError, "failed recording inquiry")
		return
	}

	WriteJSON(w, http.StatusCreated, lead)
}
