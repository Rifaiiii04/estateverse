package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"projectfai/backend/internal/app"
	"projectfai/backend/internal/config"
	"projectfai/backend/internal/database"
)

// main boots the EstateVerse backend HTTP service and shuts it down gracefully on signals.
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration error: %v", err)
	}
	log.Printf("[EstateVerse] Starting server with %s", cfg.PrintSafeSummary())

	db := openDatabase(cfg)
	if db != nil {
		defer db.Close()
	}

	ctx, stopWorkers := context.WithCancel(context.Background())
	defer stopWorkers()

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           app.Build(ctx, cfg, db),
		ReadHeaderTimeout: 15 * time.Second,
		ReadTimeout:       180 * time.Second,
		WriteTimeout:      180 * time.Second,
		IdleTimeout:       90 * time.Second,
	}

	go func() {
		log.Printf("[EstateVerse] Server listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[EstateVerse] Server failed: %v", err)
		}
	}()

	waitForShutdown(srv)
}

// openDatabase connects to MySQL and applies pending migrations, keeping the server reachable on failure.
func openDatabase(cfg *config.Config) *sql.DB {
	db, err := database.Open(cfg.DBDSN)
	if err != nil {
		log.Printf("[EstateVerse] Warning: Database connection failed: %v", err)
		return nil
	}
	log.Println("[EstateVerse] Successfully connected to MySQL database.")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := database.RunMigrations(ctx, db, "migrations"); err != nil {
		log.Printf("[EstateVerse] Notice: Auto-migration returned: %v", err)
	} else {
		log.Println("[EstateVerse] Database schema migrations verified/applied.")
	}
	return db
}

// waitForShutdown blocks until an interrupt signal arrives, then drains in-flight requests.
func waitForShutdown(srv *http.Server) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[EstateVerse] Shutting down server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("[EstateVerse] Forced shutdown: %v", err)
	}
	log.Println("[EstateVerse] Server exited properly.")
}
