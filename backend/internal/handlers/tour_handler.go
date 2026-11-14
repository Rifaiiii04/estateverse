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

// TourHandler exposes 360° tour recording, management, and public viewing endpoints.
type TourHandler struct {
	tours services.TourService
}

// NewTourHandler constructs a TourHandler.
func NewTourHandler(tours services.TourService) *TourHandler {
	return &TourHandler{tours: tours}
}

// PublicRooms returns the ready rooms of a published property for buyers.
func (h *TourHandler) PublicRooms(w http.ResponseWriter, r *http.Request) {
	propertyID, ok := queryID(w, r, "property_id")
	if !ok {
		return
	}
	rooms, err := h.tours.PublicRooms(r.Context(), propertyID)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]interface{}{"rooms": rooms})
}

// OwnerRooms returns every room (including processing and failed ones) of the seller's property.
func (h *TourHandler) OwnerRooms(w http.ResponseWriter, r *http.Request) {
	propertyID, ok := queryID(w, r, "property_id")
	if !ok {
		return
	}
	rooms, err := h.tours.OwnerRooms(r.Context(), currentUserID(r), propertyID)
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]interface{}{"rooms": rooms})
}

// Room dispatches GET (status), PATCH (name and note), and DELETE for /tours/rooms/{id}.
func (h *TourHandler) Room(w http.ResponseWriter, r *http.Request) {
	roomID, ok := pathID(w, r, "/api/v1/tours/rooms/")
	if !ok {
		return
	}
	userID := currentUserID(r)
	switch r.Method {
	case http.MethodGet:
		room, err := h.tours.GetOwnerRoom(r.Context(), userID, roomID)
		respond(w, r, http.StatusOK, room, err)
	case http.MethodPatch:
		var body struct {
			Name string `json:"name"`
			Note string `json:"note"`
		}
		if err := httpx.DecodeJSON(w, r, &body); err != nil {
			httpx.WriteDecodeError(w, err)
			return
		}
		respond(w, r, http.StatusOK, map[string]bool{"updated": true}, h.tours.UpdateRoom(r.Context(), userID, roomID, body.Name, body.Note))
	case http.MethodDelete:
		respond(w, r, http.StatusOK, map[string]bool{"deleted": true}, h.tours.DeleteRoom(r.Context(), userID, roomID))
	default:
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// Reorder saves a new display order of rooms for a property.
func (h *TourHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PropertyID int64   `json:"property_id"`
		RoomIDs    []int64 `json:"room_ids"`
	}
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	err := h.tours.ReorderRooms(r.Context(), currentUserID(r), body.PropertyID, body.RoomIDs)
	respond(w, r, http.StatusOK, map[string]bool{"updated": true}, err)
}

// CreateHotspot links two rooms with a navigation marker.
func (h *TourHandler) CreateHotspot(w http.ResponseWriter, r *http.Request) {
	var body models.TourHotspot
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	body.ID = 0
	hotspot, err := h.tours.AddHotspot(r.Context(), currentUserID(r), body)
	respond(w, r, http.StatusCreated, hotspot, err)
}

// DeleteHotspot removes a navigation marker.
func (h *TourHandler) DeleteHotspot(w http.ResponseWriter, r *http.Request) {
	hotspotID, ok := pathID(w, r, "/api/v1/tours/hotspots/")
	if !ok {
		return
	}
	err := h.tours.DeleteHotspot(r.Context(), currentUserID(r), hotspotID)
	respond(w, r, http.StatusOK, map[string]bool{"deleted": true}, err)
}

// respond writes data on success or maps the service error.
func respond(w http.ResponseWriter, r *http.Request, status int, data interface{}, err error) {
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	WriteJSON(w, status, data)
}

// currentUserID returns the authenticated user's id (routes using it are wrapped by RequireAuth).
func currentUserID(r *http.Request) int64 {
	if user := middleware.UserFromContext(r.Context()); user != nil {
		return user.ID
	}
	return 0
}

// queryID parses a positive integer query parameter, writing 400 when it is missing or malformed.
func queryID(w http.ResponseWriter, r *http.Request, key string) (int64, bool) {
	return parsePositiveID(w, r.URL.Query().Get(key))
}

// pathID parses the positive integer that follows a path prefix.
func pathID(w http.ResponseWriter, r *http.Request, prefix string) (int64, bool) {
	return parsePositiveID(w, strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/"))
}

// parsePositiveID converts text to a positive id or responds with 400.
func parsePositiveID(w http.ResponseWriter, raw string) (int64, bool) {
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		WriteError(w, http.StatusBadRequest, "invalid id")
		return 0, false
	}
	return id, true
}
