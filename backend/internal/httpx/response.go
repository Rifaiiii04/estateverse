package httpx

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// envelope wraps uniform JSON API payloads.
type envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// WriteJSON sends a successful JSON response with the given HTTP status code.
func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	write(w, status, envelope{Success: true, Data: data})
}

// WriteError sends a client-safe JSON error response with the given HTTP status code.
func WriteError(w http.ResponseWriter, status int, message string) {
	write(w, status, envelope{Success: false, Error: message})
}

// write serializes the envelope with JSON headers and logs encoding failures.
func write(w http.ResponseWriter, status int, body envelope) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("failed encoding JSON response", "error", err)
	}
}
