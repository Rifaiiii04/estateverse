package main

import (
	"context"
	"database/sql"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"projectfai/backend/internal/config"
)

type seedProp struct {
	title       string
	slug        string
	description string
	pType       string
	price       int64
	address     string
	city        string
	province    string
	landArea    int
	buildArea   int
	beds        int
	baths       int
	floors      int
	phone       string
	model3D     string
	status      string
	imageURL    string
}

// main seeds MySQL with verified architectural listings, photos, and buyer inquiries.
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	db, err := sql.Open("mysql", cfg.DBDSN)
	if err != nil {
		log.Fatalf("db open error: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Find active seller (prefer user id 3 or 1)
	var ownerID int64
	err = db.QueryRowContext(ctx, "SELECT id FROM users ORDER BY id ASC LIMIT 1").Scan(&ownerID)
	if err != nil {
		log.Fatalf("no users found to attach listings: %v", err)
	}
	log.Printf("[Seeder] Assigning listings to Seller ID: %d", ownerID)

	props := []seedProp{
		{
			title:       "Serenity Tower Residence",
			slug:        "serenity-tower-residence",
			description: "Hunian modern minimalis dengan dinding kaca luas dan teras kanopi kontemporer di kawasan Sentul.",
			pType:       "house",
			price:       3400000000,
			address:     "Jl. Villa Bukit Indah No. 12",
			city:        "Sentul, Bogor",
			province:    "Jawa Barat",
			landArea:    300,
			buildArea:   250,
			beds:        6,
			baths:       2,
			floors:      1,
			phone:       "628123456789",
			model3D:     "/api/v1/storage/models/20261102162816_c648d45935b5ad48.glb",
			status:      "published",
			imageURL:    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
		},
		{
			title:       "Island Retreat Modern Villa",
			slug:        "island-retreat-modern-villa",
			description: "Villa privat asri dengan kolam refleksi dan paviliun kaca di tebing Uluwatu Bali.",
			pType:       "villa",
			price:       2200000000,
			address:     "Jl. Pantai Bingin No. 88",
			city:        "Uluwatu, Badung",
			province:    "Bali",
			landArea:    280,
			buildArea:   250,
			beds:        4,
			baths:       1,
			floors:      1,
			phone:       "628123456789",
			model3D:     "/api/v1/storage/models/20261102162816_c648d45935b5ad48.glb",
			status:      "published",
			imageURL:    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
		},
		{
			title:       "Mountain Lodge Villa",
			slug:        "mountain-lodge-villa",
			description: "Villa geometris bertingkat dengan teras luas dan pemandangan pegunungan Dago Bandung.",
			pType:       "house",
			price:       5000000000,
			address:     "Jl. Dago Atas No. 45",
			city:        "Dago, Bandung",
			province:    "Jawa Barat",
			landArea:    450,
			buildArea:   400,
			beds:        6,
			baths:       3,
			floors:      3,
			phone:       "628123456789",
			model3D:     "",
			status:      "published",
			imageURL:    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
		},
		{
			title:       "Comporta Beach Luxury Villa",
			slug:        "comporta-beach-lux",
			description: "Hunian pantai modern minimalis dengan kolam renang pribadi dan dek kayu estetik di Seminyak.",
			pType:       "villa",
			price:       2960000000,
			address:     "Jl. Sunset Road No. 10",
			city:        "Seminyak",
			province:    "Bali",
			landArea:    320,
			buildArea:   230,
			beds:        6,
			baths:       3,
			floors:      1,
			phone:       "628123456789",
			model3D:     "",
			status:      "published",
			imageURL:    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
		},
		{
			title:       "Tulum Eco Modern Retreat",
			slug:        "tulum-eco-retreat",
			description: "Karya arsitektur dinding batu alam berpadu harmonis dengan lanskap hijau Puncak Bogor.",
			pType:       "house",
			price:       4500000000,
			address:     "Jl. Raya Ciawi No. 99",
			city:        "Cisarua, Bogor",
			province:    "Jawa Barat",
			landArea:    250,
			buildArea:   150,
			beds:        3,
			baths:       1,
			floors:      1,
			phone:       "628123456789",
			model3D:     "",
			status:      "published",
			imageURL:    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
		},
		{
			title:       "Azura Coastal Villa",
			slug:        "azura-coastal-villa",
			description: "Villa arsitektural bernuansa tropis modern dengan kolam renang tengah dan patio santai Jimbaran.",
			pType:       "villa",
			price:       4700000000,
			address:     "Jl. Karang Mas Sejahtera No. 16",
			city:        "Jimbaran",
			province:    "Bali",
			landArea:    450,
			buildArea:   400,
			beds:        6,
			baths:       2,
			floors:      2,
			phone:       "628123456789",
			model3D:     "/api/v1/storage/models/20261102162816_c648d45935b5ad48.glb",
			status:      "published",
			imageURL:    "https://images.unsplash.com/photo-1600573472591-ee6c563aaec9?auto=format&fit=crop&w=800&q=80",
		},
	}

	for _, p := range props {
		// Insert or update property
		upsertQ := `INSERT INTO properties 
			(owner_id, title, slug, description, property_type, price, address, city, province, 
			land_area, building_area, bedrooms, bathrooms, floors, whatsapp_number, model_3d_path, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE 
			title = VALUES(title), description = VALUES(description), price = VALUES(price), 
			model_3d_path = VALUES(model_3d_path), status = VALUES(status), updated_at = NOW()`

		res, err := db.ExecContext(ctx, upsertQ,
			ownerID, p.title, p.slug, p.description, p.pType, p.price, p.address, p.city, p.province,
			p.landArea, p.buildArea, p.beds, p.baths, p.floors, p.phone, p.model3D, p.status,
		)
		if err != nil {
			log.Printf("error upserting property %s: %v", p.title, err)
			continue
		}

		// Get property id
		var propID int64
		_ = db.QueryRowContext(ctx, "SELECT id FROM properties WHERE slug = ?", p.slug).Scan(&propID)

		if propID > 0 {
			// Insert image if not already present
			_, _ = db.ExecContext(ctx, `INSERT INTO property_images (property_id, file_path, alt_text, sort_order)
				SELECT ?, ?, ?, 1 FROM DUAL
				WHERE NOT EXISTS (SELECT 1 FROM property_images WHERE property_id = ? AND file_path = ?)`,
				propID, p.imageURL, p.title, propID, p.imageURL,
			)
			log.Printf("[Seeder] Upserted Property #%d: %s", propID, p.title)
		}
		_ = res
	}

	// Seed buyer leads
	var firstPropID int64
	_ = db.QueryRowContext(ctx, "SELECT id FROM properties WHERE slug = 'serenity-tower-residence'").Scan(&firstPropID)
	if firstPropID > 0 {
		_, _ = db.ExecContext(ctx, `INSERT INTO leads (property_id, owner_id, name, phone, budget, note, status)
			VALUES 
			(?, ?, 'Hendrawan Kusuma', '6281298765432', 'Rp 3.4 Milyar', 'Sangat tertarik setelah melihat mode dollhouse buka atap. Ingin survei fisik akhir pekan ini.', 'scheduled'),
			(?, ?, 'Dr. Maria Anggraini', '6281311223344', 'Rp 2.2 Milyar', 'Menanyakan skema cicilan tunai bertahap untuk investasi sewa villa di Uluwatu.', 'new'),
			(?, ?, 'Bambang Sudiro', '6281765432109', 'Rp 5.0 Milyar', 'Meminta salinan denah 3D arsitektur lengkap dan legalitas sertifikat hak milik (SHM).', 'contacted')
			ON DUPLICATE KEY UPDATE note = VALUES(note)`,
			firstPropID, ownerID, firstPropID, ownerID, firstPropID, ownerID,
		)
		log.Printf("[Seeder] Seeded buyer leads for Property #%d", firstPropID)
	}

	// Ensure both admin (user 3) and test seller (user 1) have properties
	var allUserIDs []int64
	uRows, err := db.QueryContext(ctx, "SELECT id FROM users")
	if err == nil {
		defer uRows.Close()
		for uRows.Next() {
			var uid int64
			_ = uRows.Scan(&uid)
			allUserIDs = append(allUserIDs, uid)
		}
	}

	// Update existing properties owner_id to user 3 (admin) if user 3 exists so admin sees listings
	for _, uid := range allUserIDs {
		if uid == 3 {
			_, _ = db.ExecContext(ctx, "UPDATE properties SET owner_id = 3 WHERE id IN (8, 9, 10, 11, 12, 13)")
			_, _ = db.ExecContext(ctx, "UPDATE leads SET owner_id = 3 WHERE property_id = 8")
			log.Println("[Seeder] Synced properties and leads to admin (User #3)")
		}
	}
}
