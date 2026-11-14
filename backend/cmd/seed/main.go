package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"log"
	"os"
	"time"

	"projectfai/backend/internal/config"
	"projectfai/backend/internal/database"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
	"projectfai/backend/internal/services"
)

// seeder holds what the demo seeding steps need.
type seeder struct {
	db       *sql.DB
	auth     services.AuthService
	users    repositories.UserRepository
	tours    services.TourService
	phone    string
	sellerID map[string]int64
}

// main seeds clearly labelled demo sellers, first-home listings in Central Java, leads, and optional 360° tours.
func main() {
	replaceLegacy := flag.Bool("replace-old-demo", false, "delete the luxury villa demo listings from the old seeder")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}
	password := os.Getenv("SEED_PASSWORD")
	if len(password) < 8 {
		log.Fatal("[Seeder] set SEED_PASSWORD (min. 8 karakter) untuk akun penjual demo")
	}
	db, err := database.Open(cfg.DBDSN)
	if err != nil {
		log.Fatalf("db open error: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if err := database.RunMigrations(ctx, db, "migrations"); err != nil {
		log.Fatalf("migration error: %v", err)
	}

	s := newSeeder(cfg, db)
	if *replaceLegacy {
		s.removeLegacyDemo(ctx)
	}
	s.seedSellers(ctx, password)
	s.seedListings(ctx)
	s.seedLeads(ctx)
	log.Println("[Seeder] Selesai. Login penjual demo memakai email di atas dan password SEED_PASSWORD.")
}

// newSeeder wires repositories and services the same way the API does, so validation and hashing match.
func newSeeder(cfg *config.Config, db *sql.DB) *seeder {
	users := repositories.NewUserRepository(db)
	props := repositories.NewPropertyRepository(db)
	tours := repositories.NewTourRepository(db)
	storage := services.NewStorageService(cfg.UploadDir, cfg.MaxUploadBytes())
	phone := os.Getenv("SEED_WHATSAPP")
	if phone == "" {
		phone = "628000000000" // non-routable placeholder so demo buttons never message a real person
	}
	return &seeder{
		db:       db,
		auth:     services.NewAuthService(users, repositories.NewSessionRepository(db), time.Hour),
		users:    users,
		tours:    services.NewTourService(tours, props, storage, services.NewTourQueue(tours, storage)),
		phone:    phone,
		sellerID: map[string]int64{},
	}
}

// seedSellers creates each demo seller once and remembers their ids.
func (s *seeder) seedSellers(ctx context.Context, password string) {
	for _, d := range demoSellers {
		_, err := s.auth.Register(ctx, models.RegisterInput{Name: d.name, Email: d.email, Password: password, ConfirmPassword: password})
		if err != nil && !errors.Is(err, services.ErrConflict) {
			log.Fatalf("[Seeder] gagal membuat akun %s: %v", d.email, err)
		}
		u, err := s.users.GetByEmail(ctx, d.email)
		if err != nil || u == nil {
			log.Fatalf("[Seeder] akun %s tidak ditemukan: %v", d.email, err)
		}
		s.sellerID[d.key] = u.ID
		log.Printf("[Seeder] Penjual demo: %s <%s>", d.name, d.email)
	}
}

// removeLegacyDemo deletes the old luxury demo villas (their images and leads cascade or are cleaned up).
func (s *seeder) removeLegacyDemo(ctx context.Context) {
	for _, slug := range legacyDemoSlugs {
		if _, err := s.db.ExecContext(ctx, `DELETE FROM properties WHERE slug = ?`, slug); err != nil {
			log.Printf("[Seeder] gagal menghapus demo lama %s: %v", slug, err)
		}
	}
	log.Println("[Seeder] Demo villa lama dihapus.")
}
