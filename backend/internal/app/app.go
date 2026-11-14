package app

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"projectfai/backend/internal/config"
	"projectfai/backend/internal/handlers"
	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/repositories"
	"projectfai/backend/internal/routes"
	"projectfai/backend/internal/services"
)

const (
	generalRateLimit   = 20
	assistantRateLimit = 10
	eventRateLimit     = 60
	modelQueueWorkers  = 2
)

// Build wires repositories, services, handlers, and background workers into the API handler.
func Build(ctx context.Context, cfg *config.Config, db *sql.DB) http.Handler {
	userRepo := repositories.NewUserRepository(db)
	sessionRepo := repositories.NewSessionRepository(db)
	propRepo := repositories.NewPropertyRepository(db)
	imgRepo := repositories.NewPropertyImageRepository(db)
	leadRepo := repositories.NewLeadRepository(db)
	tourRepo := repositories.NewTourRepository(db)
	statsRepo := repositories.NewStatsRepository(db)

	storageSvc := services.NewStorageService(cfg.UploadDir, cfg.MaxUploadBytes())
	modelQueue := services.NewModelQueue(storageSvc, propRepo, services.NewModelAnalyzer())
	modelQueue.Start(ctx, modelQueueWorkers)

	tourQueue := services.NewTourQueue(tourRepo, storageSvc)
	if db != nil {
		tourQueue.Start(ctx)
	}

	authSvc := services.NewAuthService(userRepo, sessionRepo, cfg.SessionTTL)
	propSvc := services.NewPropertyService(propRepo, imgRepo, modelQueue)
	tourSvc := services.NewTourService(tourRepo, propRepo, storageSvc, tourQueue)
	assistantSvc := services.NewAssistantService(cfg.OpenRouterKey, cfg.OpenRouterModel, propRepo)

	return routes.SetupRoutes(routes.RouterDeps{
		Config:        cfg,
		AuthSvc:       authSvc,
		PropSvc:       propSvc,
		StorageSvc:    storageSvc,
		HealthHdl:     handlers.NewHealthHandler(db),
		AuthHdl:       handlers.NewAuthHandler(authSvc, cfg.IsProduction()),
		PropHdl:       handlers.NewPropertyHandler(propSvc),
		StorageHdl:    handlers.NewStorageHandler(storageSvc),
		LeadHdl:       handlers.NewLeadHandler(leadRepo, propRepo),
		TourHdl:       handlers.NewTourHandler(tourSvc),
		EngagementHdl: handlers.NewEngagementHandler(statsRepo, propRepo),
		AssistantHdl:  handlers.NewAssistantHandler(assistantSvc),
		RateLimiter:   newLimiter(cfg, generalRateLimit),
		EventLimiter:  newLimiter(cfg, eventRateLimit),
		AiLimiter:     newLimiter(cfg, assistantRateLimit),
	})
}

// newLimiter creates a per-minute IP rate limiter honoring the proxy trust setting.
func newLimiter(cfg *config.Config, perMinute int) *middleware.RateLimiter {
	return middleware.NewRateLimiter(perMinute, time.Minute, cfg.TrustProxy)
}
