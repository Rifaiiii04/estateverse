package routes

import (
	"net/http"

	"projectfai/backend/internal/middleware"
)

// registerEngagementRoutes mounts engagement tracking, public impact stats, and the smart assistant.
func registerEngagementRoutes(mux *http.ServeMux, deps RouterDeps) {
	if h := deps.EngagementHdl; h != nil {
		// Events know the signed-in viewer so a seller opening their own listing is not counted as a buyer view.
		identify := middleware.OptionalAuth(deps.AuthSvc)
		mux.Handle("/api/v1/events", onlyMethod(http.MethodPost, deps.EventLimiter.Limit(identify(http.HandlerFunc(h.RecordEvent)))))
		mux.Handle("/api/v1/stats/impact", onlyMethod(http.MethodGet, http.HandlerFunc(h.Impact)))
		mux.Handle("/api/v1/reports", onlyMethod(http.MethodPost, deps.RateLimiter.Limit(http.HandlerFunc(h.Report))))
	}
	if h := deps.AssistantHdl; h != nil {
		mux.Handle("/api/v1/assistant/chat", onlyMethod(http.MethodPost, deps.AiLimiter.Limit(http.HandlerFunc(h.Chat))))
	}
}
