package routes

import (
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/services"
)

var requestSequence uint64

const maxActivityResponseBytes = 1024

// loggingMiddleware assigns request ids, emits structured logs, and persists request history.
func loggingMiddleware(next http.Handler, activity services.ActivityService) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := nextRequestID()
		ctx := middleware.WithRequestID(r.Context(), requestID)
		r = r.WithContext(ctx)
		w.Header().Set("X-Request-ID", requestID)
		recorder := &responseRecorder{ResponseWriter: w}
		started := time.Now()
		defer func() {
			recordRequest(activity, r, recorder.statusCode(), recorder.errorDetails(), time.Since(started), requestID)
		}()
		next.ServeHTTP(recorder, r)
	})
}

// nextRequestID creates a compact trace id without adding a runtime dependency.
func nextRequestID() string {
	sequence := atomic.AddUint64(&requestSequence, 1)
	return fmt.Sprintf("%x-%x", time.Now().UnixNano(), sequence)
}

// recordRequest persists one completed HTTP request and its response outcome.
func recordRequest(activity services.ActivityService, r *http.Request, status int, response string, duration time.Duration, requestID string) {
	userID := middleware.RequestUserID(r.Context())
	state := "success"
	level := slog.LevelInfo
	if status >= http.StatusInternalServerError {
		state = "error"
		level = slog.LevelError
	} else if status >= http.StatusBadRequest {
		state = "warning"
		level = slog.LevelWarn
	}
	message := fmt.Sprintf("%s %s completed with HTTP %d", r.Method, r.URL.Path, status)
	input := models.ActivityLogInput{
		UserID:    userID,
		Action:    "http.request",
		Status:    state,
		Method:    r.Method,
		Path:      trimActivityValue(r.URL.Path, 255),
		RequestID: requestID,
		Message:   trimActivityValue(message, 500),
		Details:   requestDetails(duration, response),
		Metadata: map[string]interface{}{
			"status_code": status,
			"duration_ms": duration.Milliseconds(),
		},
		IPAddress: trimActivityValue(clientIP(r), 64),
		UserAgent: trimActivityValue(r.UserAgent(), 255),
	}
	if activity != nil {
		activity.Record(r.Context(), input)
		return
	}
	slog.Log(r.Context(), level, message, "action", input.Action, "status", state,
		"request_id", requestID, "status_code", status, "duration", duration.Round(time.Millisecond))
}

// clientIP extracts the remote address without trusting forwarded headers by default.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

// trimActivityValue bounds values copied from client-controlled request fields.
func trimActivityValue(value string, limit int) string {
	value = strings.TrimSpace(value)
	if len(value) <= limit {
		return value
	}
	return value[:limit]
}

// responseRecorder captures the final HTTP status while preserving the wrapped writer.
type responseRecorder struct {
	http.ResponseWriter
	status      int
	errorBuffer strings.Builder
}

// WriteHeader records the first response status sent by a handler.
func (r *responseRecorder) WriteHeader(status int) {
	if r.status != 0 {
		return
	}
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

// Write records an implicit success status before writing response bytes.
func (r *responseRecorder) Write(body []byte) (int, error) {
	if r.status == 0 {
		r.WriteHeader(http.StatusOK)
	}
	if r.status >= http.StatusBadRequest && r.errorBuffer.Len() < maxActivityResponseBytes {
		remaining := maxActivityResponseBytes - r.errorBuffer.Len()
		preview := body
		if len(preview) > remaining {
			preview = preview[:remaining]
		}
		r.errorBuffer.Write(preview)
	}
	return r.ResponseWriter.Write(body)
}

// Unwrap exposes the original writer to http.ResponseController.
func (r *responseRecorder) Unwrap() http.ResponseWriter {
	return r.ResponseWriter
}

// statusCode returns the handler status, defaulting to success when no body was written.
func (r *responseRecorder) statusCode() int {
	if r.status == 0 {
		return http.StatusOK
	}
	return r.status
}

// errorDetails returns a bounded client-safe response fragment for failed request diagnosis.
func (r *responseRecorder) errorDetails() string {
	return trimActivityValue(r.errorBuffer.String(), maxActivityResponseBytes)
}

// requestDetails combines latency with the safe error response when one was emitted.
func requestDetails(duration time.Duration, response string) string {
	details := fmt.Sprintf("duration=%s", duration.Round(time.Millisecond))
	if response != "" {
		details += " response=" + response
	}
	return details
}
