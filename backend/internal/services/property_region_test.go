package services

import (
	"testing"

	"projectfai/backend/internal/models"
)

// regionInput builds a property input with only the location fields set.
func regionInput(city, province string, lat, lng *float64) models.PropertyInput {
	return models.PropertyInput{City: city, Province: province, Latitude: lat, Longitude: lng}
}

// TestRegionDataLoaded makes sure the embedded province/city file parses.
func TestRegionDataLoaded(t *testing.T) {
	if len(regions.provinces) < 30 || len(regions.cityProvinces) < 500 {
		t.Fatalf("region data incomplete: %d provinces, %d cities", len(regions.provinces), len(regions.cityProvinces))
	}
}

// TestRegionRejectsCityFromAnotherProvince reproduces BUG-09: Kabupaten Bandung saved under Jawa Timur.
func TestRegionRejectsCityFromAnotherProvince(t *testing.T) {
	if err := validatePropertyRegion(regionInput("KABUPATEN BANDUNG", "JAWA TIMUR", nil, nil)); err == nil {
		t.Fatal("Kabupaten Bandung accepted in Jawa Timur")
	}
	if err := validatePropertyRegion(regionInput("Kabupaten Bandung", "Jawa Barat", nil, nil)); err != nil {
		t.Fatalf("valid pair rejected: %v", err)
	}
}

// TestRegionAllowsUnknownNames keeps free-text cities and newer provinces working.
func TestRegionAllowsUnknownNames(t *testing.T) {
	for _, in := range []models.PropertyInput{
		regionInput("Bandung", "Jawa Barat", nil, nil),
		regionInput("KOTA MERAUKE", "PAPUA SELATAN", nil, nil),
	} {
		if err := validatePropertyRegion(in); err != nil {
			t.Errorf("%s/%s rejected: %v", in.City, in.Province, err)
		}
	}
}

// TestRegionRejectsPinOutsideProvince reproduces BUG-24: Kab. Bogor listing pinned in Jambi.
func TestRegionRejectsPinOutsideProvince(t *testing.T) {
	jambiLat, jambiLng := -1.160966, 103.850386
	if err := validatePropertyRegion(regionInput("KABUPATEN BOGOR", "JAWA BARAT", &jambiLat, &jambiLng)); err == nil {
		t.Fatal("pin in Jambi accepted for Jawa Barat")
	}
	bogorLat, bogorLng := -6.595, 106.816
	if err := validatePropertyRegion(regionInput("KABUPATEN BOGOR", "JAWA BARAT", &bogorLat, &bogorLng)); err != nil {
		t.Fatalf("pin in Bogor rejected: %v", err)
	}
}
