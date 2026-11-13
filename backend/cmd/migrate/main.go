package main

import (
	"context"
	"log"
	"time"

	"projectfai/backend/internal/config"
	"projectfai/backend/internal/database"
)

// main runs pending SQL migrations directly against the configured database.
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("configuration load failed: %v", err)
	}

	log.Printf("[EstateVerse Migrations] Connecting to database...")
	db, err := database.Open(cfg.DBDSN)
	if err != nil {
		log.Fatalf("[EstateVerse Migrations] Failed to connect: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	log.Printf("[EstateVerse Migrations] Running migrations from 'migrations' directory...")
	if err := database.RunMigrations(ctx, db, "migrations"); err != nil {
		log.Fatalf("[EstateVerse Migrations] Migration failed: %v", err)
	}

	log.Printf("[EstateVerse Migrations] All migrations executed successfully!")
}
