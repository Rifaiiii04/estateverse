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
	uploadRateLimit    = 40
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
	activitySvc := services.NewActivityService(repositories.NewActivityLogRepository(db))

	storageSvc := services.NewStorageService(cfg.UploadDir, cfg.MaxUploadBytes())
	modelQueue := services.NewModelQueue(storageSvc, propRepo, services.NewModelAnalyzer(), activitySvc)
	modelQueue.Start(ctx, modelQueueWorkers)

	tourQueue := services.NewTourQueue(tourRepo, storageSvc, activitySvc)
	if db != nil {
		tourQueue.Start(ctx)
	}

	authSvc := services.NewAuthService(userRepo, sessionRepo, cfg.SessionTTL)
	photos := services.NewPhotoFingerprinter(repositories.NewImageFingerprintRepository(db), storageSvc)
	if db != nil {
		photos.StartBackfill(ctx)
	}
	media := services.NewMediaJanitor(repositories.NewMediaReferenceRepository(db), storageSvc)
	if db != nil {
		media.Start(ctx)
	}
	propSvc := services.NewPropertyServiceWithTours(propRepo, imgRepo, modelQueue, tourRepo, photos, media)
	tourSvc := services.NewTourService(tourRepo, propRepo, storageSvc, tourQueue)
	assistantSvc := services.NewAssistantService(cfg.OpenRouterKey, cfg.OpenRouterModel, propRepo)
	mailer := services.NewSMTPMailer(services.SMTPConfig(cfg.SMTP))
	accountSvc := services.NewAccountService(userRepo, repositories.NewAccountRepository(db), propSvc,
		mailer, cfg.FrontendOrigin, !cfg.IsProduction())
	authHdl := handlers.NewAuthHandler(authSvc, cfg.IsProduction(), activitySvc)

	return routes.SetupRoutes(routes.RouterDeps{
		Config:        cfg,
		AuthSvc:       authSvc,
		PropSvc:       propSvc,
		StorageSvc:    storageSvc,
		HealthHdl:     handlers.NewHealthHandler(db),
		AuthHdl:       authHdl,
		AccountHdl:    handlers.NewAccountHandler(accountSvc, authHdl),
		PropHdl:       handlers.NewPropertyHandler(propSvc),
		StorageHdl:    handlers.NewStorageHandler(storageSvc, photos),
		LeadHdl:       handlers.NewLeadHandler(leadRepo, propRepo),
		TourHdl:       handlers.NewTourHandler(tourSvc),
		EngagementHdl: handlers.NewEngagementHandler(statsRepo, propRepo),
		AssistantHdl:  handlers.NewAssistantHandler(assistantSvc),
		ActivityHdl:   handlers.NewActivityHandler(activitySvc),
		ActivitySvc:   activitySvc,
		RateLimiter:   newLimiter(cfg, generalRateLimit),
		EventLimiter:  newLimiter(cfg, eventRateLimit),
		AiLimiter:     newLimiter(cfg, assistantRateLimit),
		UploadLimiter: newLimiter(cfg, uploadRateLimit),
	})
}

// newLimiter creates a per-minute IP rate limiter honoring the proxy trust setting.
func newLimiter(cfg *config.Config, perMinute int) *middleware.RateLimiter {
	return middleware.NewRateLimiter(perMinute, time.Minute, cfg.TrustProxy)
}
