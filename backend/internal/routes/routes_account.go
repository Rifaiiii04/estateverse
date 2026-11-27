package routes

import "net/http"

// registerAccountRoutes mounts account settings (signed-in) and the public, rate-limited password reset flow.
func registerAccountRoutes(mux *http.ServeMux, deps RouterDeps, requireAuth func(http.Handler) http.Handler) {
	h := deps.AccountHdl
	if h == nil {
		return
	}
	// signedIn throttles a handler per client and requires a valid session.
	signedIn := func(next http.HandlerFunc) http.Handler { return deps.RateLimiter.Limit(requireAuth(next)) }
	mux.Handle("/api/v1/account/profile", onlyMethod(http.MethodPatch, signedIn(h.UpdateProfile)))
	mux.Handle("/api/v1/account/password", onlyMethod(http.MethodPost, signedIn(h.ChangePassword)))
	mux.Handle("/api/v1/account", onlyMethod(http.MethodDelete, signedIn(h.DeleteAccount)))
	mux.Handle("/api/v1/auth/password/forgot", onlyMethod(http.MethodPost, deps.RateLimiter.Limit(http.HandlerFunc(h.ForgotPassword))))
	mux.Handle("/api/v1/auth/password/reset", onlyMethod(http.MethodPost, deps.RateLimiter.Limit(http.HandlerFunc(h.ResetPassword))))
}
