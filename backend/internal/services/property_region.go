package services

import (
	_ "embed"
	"encoding/json"
	"strings"

	"projectfai/backend/internal/models"
)

// region_data.json maps each province (names as in the emsifa wilayah API that the seller form uses) to its
// regencies/cities and a bounding box [south, north, west, east] taken from OpenStreetMap Nominatim.
//
//go:embed region_data.json
var regionDataJSON []byte

// pinBoundsMarginDegrees tolerates pins just outside a province box (about 20 km) so border houses are not rejected.
const pinBoundsMarginDegrees = 0.2

type provinceRegion struct {
	BBox   [4]float64 `json:"bbox"`
	Cities []string   `json:"cities"`
}

// regionIndex holds the province data plus a reverse lookup from city to the provinces that contain it.
type regionIndex struct {
	provinces     map[string]provinceRegion
	cityProvinces map[string]map[string]bool
}

var regions = loadRegionIndex(regionDataJSON)

// loadRegionIndex parses the embedded region data; a broken file disables region checks instead of crashing.
func loadRegionIndex(raw []byte) regionIndex {
	idx := regionIndex{provinces: map[string]provinceRegion{}, cityProvinces: map[string]map[string]bool{}}
	if err := json.Unmarshal(raw, &idx.provinces); err != nil {
		return idx
	}
	for province, region := range idx.provinces {
		for _, city := range region.Cities {
			if idx.cityProvinces[city] == nil {
				idx.cityProvinces[city] = map[string]bool{}
			}
			idx.cityProvinces[city][province] = true
		}
	}
	return idx
}

// regionKey normalizes a province or city name for lookup.
func regionKey(name string) string {
	return strings.ToUpper(strings.Join(strings.Fields(name), " "))
}

// validatePropertyRegion rejects a city that belongs to a different province and a map pin outside the province.
// Unknown names (newer provinces, other clients) are allowed so the check never blocks a legitimate listing.
func validatePropertyRegion(in models.PropertyInput) error {
	province, city := regionKey(in.Province), regionKey(in.City)
	region, knownProvince := regions.provinces[province]
	if !knownProvince {
		return nil
	}
	if owners := regions.cityProvinces[city]; len(owners) > 0 && !owners[province] {
		return newValidationError("kota/kabupaten " + in.City + " tidak berada di provinsi " + in.Province)
	}
	if in.Latitude != nil && in.Longitude != nil && !region.contains(*in.Latitude, *in.Longitude) {
		return newValidationError("titik lokasi di peta berada di luar provinsi " + in.Province + "; geser pin ke lokasi rumah")
	}
	return nil
}

// contains reports whether a coordinate lies inside the province box widened by the border margin.
func (r provinceRegion) contains(lat, lng float64) bool {
	south, north, west, east := r.BBox[0], r.BBox[1], r.BBox[2], r.BBox[3]
	m := pinBoundsMarginDegrees
	return lat >= south-m && lat <= north+m && lng >= west-m && lng <= east+m
}
