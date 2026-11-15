package routes

import (
	"net/http"

	"projectfai/backend/internal/config"
	"projectfai/backend/internal/handlers"
	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/services"
)

// RouterDeps holds handler and service dependencies needed to configure routes.
type RouterDeps struct {
	Config        *config.Config
	AuthSvc       services.AuthService
	PropSvc       services.PropertyService
	StorageSvc    services.StorageService
	HealthHdl     *handlers.HealthHandler
	AuthHdl       *handlers.AuthHandler
	PropHdl       *handlers.PropertyHandler
	StorageHdl    *handlers.StorageHandler
	LeadHdl       *handlers.LeadHandler
	TourHdl       *handlers.TourHandler
	EngagementHdl *handlers.EngagementHandler
	AssistantHdl  *handlers.AssistantHandler
	ActivityHdl   *handlers.ActivityHandler
	ActivitySvc   services.ActivityService
	RateLimiter   *middleware.RateLimiter
	EventLimiter  *middleware.RateLimiter
	AiLimiter     *middleware.RateLimiter
}

// SetupRoutes registers all application API routes and middleware chain.
func SetupRoutes(deps RouterDeps) http.Handler {
	mux := http.NewServeMux()
	requireAuth := middleware.RequireAuth(deps.AuthSvc)

	mux.HandleFunc("/health", deps.HealthHdl.Check)
	mux.HandleFunc("/api/v1/health", deps.HealthHdl.Check)

	// Auth routes
	mux.Handle("/api/v1/auth/register", deps.RateLimiter.Limit(http.HandlerFunc(deps.AuthHdl.Register)))
	mux.Handle("/api/v1/auth/login", deps.RateLimiter.Limit(http.HandlerFunc(deps.AuthHdl.Login)))
	mux.Handle("/api/v1/auth/mobile/login", deps.RateLimiter.Limit(http.HandlerFunc(deps.AuthHdl.LoginMobile)))
	mux.HandleFunc("/api/v1/auth/logout", deps.AuthHdl.Logout)
	mux.Handle("/api/v1/auth/me", requireAuth(http.HandlerFunc(deps.AuthHdl.Me)))

	// Public property routes and protected property mutators
	mux.HandleFunc("/api/v1/properties", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			deps.PropHdl.ListPublic(w, r)
		case http.MethodPost:
			requireAuth(http.HandlerFunc(deps.PropHdl.Create)).ServeHTTP(w, r)
		default:
			handlers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})

	mux.HandleFunc("/api/v1/properties/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			deps.PropHdl.GetPublic(w, r)
		case http.MethodPatch, http.MethodPut:
			requireAuth(http.HandlerFunc(deps.PropHdl.Update)).ServeHTTP(w, r)
		case http.MethodDelete:
			requireAuth(http.HandlerFunc(deps.PropHdl.Delete)).ServeHTTP(w, r)
		default:
			handlers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})

	// Seller dashboard routes
	mux.Handle("/api/v1/dashboard/summary", requireAuth(http.HandlerFunc(deps.PropHdl.GetDashboardSummary)))
	if deps.ActivityHdl != nil {
		mux.Handle("/api/v1/dashboard/activity", requireAuth(http.HandlerFunc(deps.ActivityHdl.List)))
	}
	mux.HandleFunc("/api/v1/dashboard/properties", func(w http.ResponseWriter, r *http.Request) {
		requireAuth(http.HandlerFunc(deps.PropHdl.ListDashboard)).ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/v1/dashboard/properties/", func(w http.ResponseWriter, r *http.Request) {
		requireAuth(http.HandlerFunc(deps.PropHdl.GetOwnerProperty)).ServeHTTP(w, r)
	})

	// Leads and inquiries routes
	if deps.LeadHdl != nil {
		mux.HandleFunc("/api/v1/leads", func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost {
				deps.RateLimiter.Limit(http.HandlerFunc(deps.LeadHdl.CreateLead)).ServeHTTP(w, r)
			} else {
				handlers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			}
		})
		mux.HandleFunc("/api/v1/owner/leads", func(w http.ResponseWriter, r *http.Request) {
			requireAuth(http.HandlerFunc(deps.LeadHdl.ListOwnerLeads)).ServeHTTP(w, r)
		})
		mux.HandleFunc("/api/v1/owner/leads/", func(w http.ResponseWriter, r *http.Request) {
			requireAuth(http.HandlerFunc(deps.LeadHdl.UpdateLeadStatus)).ServeHTTP(w, r)
		})
	}

	registerTourRoutes(mux, deps, requireAuth)
	registerEngagementRoutes(mux, deps)

	// Upload routes
	mux.Handle("/api/v1/upload/image", requireAuth(http.HandlerFunc(deps.StorageHdl.UploadImage)))
	mux.Handle("/api/v1/upload/model", requireAuth(http.HandlerFunc(deps.StorageHdl.UploadModel)))

	// Static storage serving
	mux.HandleFunc("/api/v1/storage/", deps.StorageHdl.ServeFile)

	// Middleware wrapping
	handler := middleware.ValidateOrigin(deps.Config.FrontendOrigin)(mux)
	handler = middleware.Cors(deps.Config.FrontendOrigin)(handler)
	handler = middleware.SecurityHeaders(handler)

	return loggingMiddleware(handler, deps.ActivitySvc)
}
