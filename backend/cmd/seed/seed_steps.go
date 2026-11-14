package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

const seedPanoramaDir = "seed/panoramas"

// seedListings upserts every demo listing by slug and attaches optional seed panoramas.
func (s *seeder) seedListings(ctx context.Context) {
	for _, l := range demoListings {
		id, err := s.upsertListing(ctx, l)
		if err != nil {
			log.Printf("[Seeder] gagal menyimpan %s: %v", l.slug, err)
			continue
		}
		log.Printf("[Seeder] Listing #%d: %s", id, l.title)
		s.importPanoramas(ctx, s.sellerID[l.seller], id, l.slug)
	}
}

// upsertListing inserts or refreshes one published demo listing and returns its id.
func (s *seeder) upsertListing(ctx context.Context, l demoListing) (int64, error) {
	benefits, _ := json.Marshal(l.benefits)
	_, err := s.db.ExecContext(ctx, `INSERT INTO properties
		(owner_id, title, slug, description, property_type, price, address, city, province,
		land_area, building_area, bedrooms, bathrooms, floors, whatsapp_number, model_3d_path, benefits, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, 'published')
		ON DUPLICATE KEY UPDATE owner_id = VALUES(owner_id), title = VALUES(title), description = VALUES(description),
		property_type = VALUES(property_type), price = VALUES(price), address = VALUES(address), city = VALUES(city),
		province = VALUES(province), land_area = VALUES(land_area), building_area = VALUES(building_area),
		bedrooms = VALUES(bedrooms), bathrooms = VALUES(bathrooms), floors = VALUES(floors),
		whatsapp_number = VALUES(whatsapp_number), benefits = VALUES(benefits), status = 'published'`,
		s.sellerID[l.seller], l.title, l.slug, l.description, l.pType, l.price, l.address, l.city, l.province,
		l.landArea, l.buildArea, l.beds, l.baths, l.floors, s.phone, string(benefits))
	if err != nil {
		return 0, err
	}
	var id int64
	err = s.db.QueryRowContext(ctx, `SELECT id FROM properties WHERE slug = ?`, l.slug).Scan(&id)
	return id, err
}

// importPanoramas adds ready-made 2:1 panoramas from seed/panoramas/<slug>/NN-room-name.jpg, skipping existing rooms.
func (s *seeder) importPanoramas(ctx context.Context, ownerID, propertyID int64, slug string) {
	files, _ := filepath.Glob(filepath.Join(seedPanoramaDir, slug, "*.jpg"))
	if len(files) == 0 {
		return
	}
	existing, _ := s.tours.OwnerRooms(ctx, ownerID, propertyID)
	if len(existing) > 0 {
		return
	}
	sort.Strings(files)
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		if _, err := s.tours.ImportPanorama(ctx, ownerID, propertyID, roomNameFromFile(f), data); err != nil {
			log.Printf("[Seeder] panorama %s dilewati: %v", f, err)
		}
	}
}

// roomNameFromFile turns "02-ruang-tamu.jpg" into "Ruang Tamu".
func roomNameFromFile(path string) string {
	base := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	if i := strings.Index(base, "-"); i >= 0 && i <= 3 {
		base = base[i+1:]
	}
	words := strings.Fields(strings.ReplaceAll(base, "-", " "))
	for i, w := range words {
		words[i] = strings.ToUpper(w[:1]) + w[1:]
	}
	return strings.Join(words, " ")
}

// seedLeads inserts sample inquiries once per listing so the seller dashboard has realistic data.
func (s *seeder) seedLeads(ctx context.Context) {
	for _, l := range demoLeads {
		var propertyID, ownerID int64
		err := s.db.QueryRowContext(ctx, `SELECT id, owner_id FROM properties WHERE slug = ?`, l.slug).Scan(&propertyID, &ownerID)
		if err != nil {
			continue
		}
		_, err = s.db.ExecContext(ctx, `INSERT INTO leads (property_id, owner_id, name, phone, budget, note, viewed_tour, status)
			SELECT ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL
			WHERE NOT EXISTS (SELECT 1 FROM leads WHERE property_id = ? AND name = ?)`,
			propertyID, ownerID, l.name, s.phone, l.budget, l.note, l.viewedTour, l.status, propertyID, l.name)
		if err != nil {
			log.Printf("[Seeder] gagal menyimpan lead demo: %v", err)
		}
	}
}
