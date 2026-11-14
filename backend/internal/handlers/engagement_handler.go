package handlers

import (
	"log/slog"
	"net/http"
	"strings"
	"unicode/utf8"

	"projectfai/backend/internal/httpx"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// EngagementHandler records buyer engagement events and serves public impact figures.
type EngagementHandler struct {
	stats repositories.StatsRepository
	props repositories.PropertyRepository
}

// NewEngagementHandler constructs an EngagementHandler.
func NewEngagementHandler(stats repositories.StatsRepository, props repositories.PropertyRepository) *EngagementHandler {
	return &EngagementHandler{stats: stats, props: props}
}

// RecordEvent stores a detail-page view or virtual tour open for a published property.
func (h *EngagementHandler) RecordEvent(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PropertyID int64  `json:"property_id"`
		Kind       string `json:"kind"`
	}
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	if !isViewKind(body.Kind) || body.PropertyID <= 0 {
		WriteError(w, http.StatusBadRequest, "invalid event")
		return
	}
	prop, err := h.props.GetByID(r.Context(), body.PropertyID)
	if err != nil || prop == nil || prop.Status != models.StatusPublished {
		WriteError(w, http.StatusNotFound, "resource not found")
		return
	}
	if err := h.stats.RecordView(r.Context(), body.PropertyID, body.Kind); err != nil {
		slog.Error("failed recording view", "error", err)
		WriteError(w, http.StatusInternalServerError, internalErrorMessage)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]bool{"recorded": true})
}

// Impact returns platform-wide aggregate counts for the public impact section.
func (h *EngagementHandler) Impact(w http.ResponseWriter, r *http.Request) {
	stats, err := h.stats.PublicImpact(r.Context())
	if err != nil {
		slog.Error("failed computing impact stats", "error", err)
		WriteError(w, http.StatusInternalServerError, internalErrorMessage)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	WriteJSON(w, http.StatusOK, stats)
}

// Report stores a visitor's report about a suspicious or incorrect published listing.
func (h *EngagementHandler) Report(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PropertyID int64  `json:"property_id"`
		Reason     string `json:"reason"`
		Note       string `json:"note"`
	}
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	body.Note = strings.TrimSpace(body.Note)
	if body.PropertyID <= 0 || !models.ReportReasons[body.Reason] || utf8.RuneCountInString(body.Note) > 500 {
		WriteError(w, http.StatusBadRequest, "invalid report")
		return
	}
	prop, err := h.props.GetByID(r.Context(), body.PropertyID)
	if err != nil || prop == nil || prop.Status != models.StatusPublished {
		WriteError(w, http.StatusNotFound, "resource not found")
		return
	}
	if err := h.stats.CreateReport(r.Context(), body.PropertyID, body.Reason, body.Note); err != nil {
		slog.Error("failed storing listing report", "error", err)
		WriteError(w, http.StatusInternalServerError, internalErrorMessage)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]bool{"reported": true})
}

// isViewKind accepts only the known engagement event kinds.
func isViewKind(kind string) bool {
	return kind == repositories.ViewDetail || kind == repositories.ViewTour360 || kind == repositories.ViewTour3D
}
