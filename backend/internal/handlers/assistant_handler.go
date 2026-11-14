package handlers

import (
	"errors"
	"net/http"

	"projectfai/backend/internal/httpx"
	"projectfai/backend/internal/services"
)

// AssistantHandler exposes the LLM-backed smart assistant.
type AssistantHandler struct {
	assistant services.AssistantService
}

// NewAssistantHandler constructs an AssistantHandler.
func NewAssistantHandler(assistant services.AssistantService) *AssistantHandler {
	return &AssistantHandler{assistant: assistant}
}

// Chat answers a conversation; responds 503 when the model is unavailable so the client can fall back offline.
func (h *AssistantHandler) Chat(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Messages     []services.ChatMessage `json:"messages"`
		PropertySlug string                 `json:"property_slug"`
	}
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		httpx.WriteDecodeError(w, err)
		return
	}
	reply, err := h.assistant.Reply(r.Context(), body.Messages, body.PropertySlug)
	if errors.Is(err, services.ErrAssistantUnavailable) {
		WriteError(w, http.StatusServiceUnavailable, "assistant_unavailable")
		return
	}
	if err != nil {
		writeServiceError(w, r, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"reply": reply, "mode": "ai"})
}
