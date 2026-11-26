package middleware

import (
	"net/http"
	"net/url"

	"projectfai/backend/internal/httpx"
)

// Cors configures Cross-Origin Resource Sharing and handles preflight options.
func Cors(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Vary", "Origin")
			origin := r.Header.Get("Origin")

			if origin != "" && isOriginAllowed(origin, allowedOrigin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// SecurityHeaders applies baseline HTTP defensive headers across all responses.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

// ValidateOrigin validates the Origin header on state-changing requests to mitigate CSRF.
func ValidateOrigin(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isStateChangingMethod(r.Method) {
				origin := r.Header.Get("Origin")
				if origin != "" && !isOriginAllowed(origin, allowedOrigin) {
					httpx.WriteError(w, http.StatusForbidden, "forbidden origin")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// isStateChangingMethod reports whether the HTTP method may modify server state.
func isStateChangingMethod(method string) bool {
	return method == http.MethodPost || method == http.MethodPut ||
		method == http.MethodPatch || method == http.MethodDelete
}

// isOriginAllowed checks whether the candidate Origin matches allowed policy without prefix bypass bugs.
func isOriginAllowed(origin, allowed string) bool {
	if allowed == "*" || origin == allowed {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	hostname := u.Hostname()
	return hostname == "localhost" || hostname == "127.0.0.1"
}
