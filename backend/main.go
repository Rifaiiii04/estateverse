package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"projectfai/backend/internal/config"
	"projectfai/backend/internal/database"
	"projectfai/backend/internal/handlers"
	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/repositories"
	"projectfai/backend/internal/routes"
	"projectfai/backend/internal/services"
)

// main boots the EstateVerse backend HTTP service.
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration error: %v", err)
	}

	log.Printf("[EstateVerse] Starting server with %s", cfg.PrintSafeSummary())

	db, err := database.Open(cfg.DBDSN)
	if err != nil {
		log.Printf("[EstateVerse] Warning: Database connection failed: %v", err)
		log.Println("[EstateVerse] Continuing startup so diagnostic endpoints remain reachable.")
	} else {
		defer db.Close()
		log.Println("[EstateVerse] Successfully connected to MySQL database.")

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		if err := database.RunMigrations(ctx, db, "migrations"); err != nil {
			log.Printf("[EstateVerse] Notice: Auto-migration returned: %v", err)
		} else {
			log.Println("[EstateVerse] Database schema migrations verified/applied.")
		}
		cancel()
	}

	userRepo := repositories.NewUserRepository(db)
	sessionRepo := repositories.NewSessionRepository(db)
	propRepo := repositories.NewPropertyRepository(db)
	imgRepo := repositories.NewPropertyImageRepository(db)

	storageSvc := services.NewStorageService(cfg.UploadDir, cfg.MaxUploadBytes())
	modelAnalyzer := services.NewModelAnalyzer()
	modelQueue := services.NewModelQueue(storageSvc, propRepo, modelAnalyzer)
	modelQueue.Start(context.Background(), 2)

	authSvc := services.NewAuthService(userRepo, sessionRepo, cfg.SessionTTL)
	propSvc := services.NewPropertyService(propRepo, imgRepo, modelQueue)

	healthHdl := handlers.NewHealthHandler(db)
	authHdl := handlers.NewAuthHandler(authSvc, cfg.IsProduction())
	propHdl := handlers.NewPropertyHandler(propSvc)
	storageHdl := handlers.NewStorageHandler(storageSvc)
	rateLimiter := middleware.NewRateLimiter(20, time.Minute)

	router := routes.SetupRoutes(routes.RouterDeps{
		Config:      cfg,
		AuthSvc:     authSvc,
		PropSvc:     propSvc,
		StorageSvc:  storageSvc,
		HealthHdl:   healthHdl,
		AuthHdl:     authHdl,
		PropHdl:     propHdl,
		StorageHdl:  storageHdl,
		RateLimiter: rateLimiter,
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[EstateVerse] Server listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[EstateVerse] Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[EstateVerse] Shutting down server gracefully...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[EstateVerse] Server forced to shutdown: %v", err)
	}
	log.Println("[EstateVerse] Server exited properly.")
}
