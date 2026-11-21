package routes

import (
	"net/http"

	"projectfai/backend/internal/handlers"
)

// registerTourRoutes mounts 360° tour recording, management, and public viewing endpoints.
func registerTourRoutes(mux *http.ServeMux, deps RouterDeps, requireAuth func(http.Handler) http.Handler) {
	h := deps.TourHdl
	if h == nil {
		return
	}
	limited := func(fn http.HandlerFunc) http.Handler {
		return deps.RateLimiter.Limit(requireAuth(fn))
	}

	mux.Handle("/api/v1/tours/public", onlyMethod(http.MethodGet, http.HandlerFunc(h.PublicRooms)))
	mux.Handle("/api/v1/tours/owner", onlyMethod(http.MethodGet, requireAuth(http.HandlerFunc(h.OwnerRooms))))
	mux.Handle("/api/v1/tours/captures", onlyMethod(http.MethodPost, limited(h.CreateCapture)))
	mux.Handle("/api/v1/tours/calibration", onlyMethod(http.MethodPost, limited(h.CalibrateCapture)))
	mux.Handle("/api/v1/tours/imports", onlyMethod(http.MethodPost, limited(h.ImportPanorama)))
	mux.Handle("/api/v1/tours/order", onlyMethod(http.MethodPut, requireAuth(http.HandlerFunc(h.Reorder))))
	mux.Handle("/api/v1/tours/rooms/", requireAuth(http.HandlerFunc(h.Room)))
	mux.Handle("/api/v1/tours/layouts/", onlyMethod(http.MethodPut, requireAuth(http.HandlerFunc(h.SaveLayout))))
	mux.Handle("/api/v1/tours/hotspots", onlyMethod(http.MethodPost, requireAuth(http.HandlerFunc(h.CreateHotspot))))
	mux.Handle("/api/v1/tours/hotspots/", onlyMethod(http.MethodDelete, requireAuth(http.HandlerFunc(h.DeleteHotspot))))
}

// onlyMethod rejects requests whose HTTP method differs from the allowed one.
func onlyMethod(method string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			handlers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		next.ServeHTTP(w, r)
	})
}
