package handlers

import (
	"net/http"

	"projectfai/backend/internal/httpx"
	"projectfai/backend/internal/models"
)

// SaveLayout stores the camera height and traced floor outline of a room at /tours/layouts/{roomId}.
func (h *TourHandler) SaveLayout(w http.ResponseWriter, r *http.Request) {
	roomID, ok := pathID(w, r, "/api/v1/tours/layouts/")
	if !ok {
		return
	}
	var body models.RoomLayout
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	err := h.tours.SaveLayout(r.Context(), currentUserID(r), roomID, body)
	respond(w, r, http.StatusOK, map[string]bool{"updated": true}, err)
}
