package services

import (
	"regexp"
	"strings"

	"projectfai/backend/internal/models"
)

const (
	maxTitleRunes       = 180
	maxDescriptionRunes = 5000
	maxAddressRunes     = 255
	maxRegionRunes      = 100
	maxPrice            = 1_000_000_000_000_000
	maxAreaSquareMeters = 1_000_000
	maxRoomCount        = 50
	maxFloorCount       = 10
	maxImagesPerListing = 20
	maxBenefitsCount    = 20
	maxBenefitRunes     = 100
)

var (
	allowedPropertyTypes = map[string]bool{"house": true, "villa": true, "townhouse": true, "cluster": true}
	imagePathPattern     = regexp.MustCompile(`^/api/v1/storage/images/\d{14}_[0-9a-f]{16,32}\.(jpg|jpeg|png|webp)$`)
	modelPathPattern     = regexp.MustCompile(`^/api/v1/storage/models/\d{14}_[0-9a-f]{16,32}\.(glb|gltf|fbx|obj)$`)
	whatsAppPattern      = regexp.MustCompile(`^62[1-9][0-9]{7,12}$`)
	nonDigitPattern      = regexp.MustCompile(`[^0-9]`)
)

// DemoWhatsAppPlaceholder is the non-routable number the seeder gives demo listings; buyers see it as "not available".
const DemoWhatsAppPlaceholder = "628000000000"

// sanitizePropertyInput trims, normalizes, and validates every client-supplied property field.
func sanitizePropertyInput(in models.PropertyInput) (models.PropertyInput, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	in.Address = strings.TrimSpace(in.Address)
	in.City = strings.TrimSpace(in.City)
	in.Province = strings.TrimSpace(in.Province)
	in.PropertyType = strings.ToLower(strings.TrimSpace(in.PropertyType))
	in.Model3DPath = strings.TrimSpace(in.Model3DPath)
	in.WhatsAppNumber = NormalizeWhatsApp(in.WhatsAppNumber)
	in.Benefits = sanitizeBenefits(in.Benefits)
	if in.PropertyType == "" {
		in.PropertyType = "house"
	}
	if in.Status != models.StatusPublished {
		in.Status = models.StatusDraft
	}

	if err := validatePropertyText(in); err != nil {
		return in, err
	}
	if err := validatePropertyNumbers(in); err != nil {
		return in, err
	}
	if err := validatePropertyMedia(in); err != nil {
		return in, err
	}
	if err := validatePropertyPin(in); err != nil {
		return in, err
	}
	if err := validatePropertyRegion(in); err != nil {
		return in, err
	}
	return in, nil
}

// validatePropertyText checks textual fields for length, encoding, and allowed values.
func validatePropertyText(in models.PropertyInput) error {
	if err := validateText("title", in.Title, 3, maxTitleRunes); err != nil {
		return err
	}
	if err := validateMultilineText("description", in.Description, 10, maxDescriptionRunes); err != nil {
		return err
	}
	if err := validateText("address", in.Address, 3, maxAddressRunes); err != nil {
		return err
	}
	if err := validateText("city", in.City, 2, maxRegionRunes); err != nil {
		return err
	}
	if err := validateText("province", in.Province, 2, maxRegionRunes); err != nil {
		return err
	}
	if !allowedPropertyTypes[in.PropertyType] {
		return newValidationError("property type is not supported")
	}
	if !whatsAppPattern.MatchString(in.WhatsAppNumber) {
		return newValidationError("valid WhatsApp phone number is required")
	}
	if in.WhatsAppNumber == DemoWhatsAppPlaceholder {
		return newValidationError("isi nomor WhatsApp penjual yang aktif, bukan nomor contoh")
	}
	return nil
}

// validatePropertyNumbers enforces realistic bounds on price, areas, and room counts.
func validatePropertyNumbers(in models.PropertyInput) error {
	if in.Price <= 0 || in.Price > maxPrice {
		return newValidationError("price is out of the allowed range")
	}
	if in.LandArea <= 0 || in.LandArea > maxAreaSquareMeters || in.BuildingArea <= 0 || in.BuildingArea > maxAreaSquareMeters {
		return newValidationError("land and building area must be positive and realistic")
	}
	if in.Bedrooms < 0 || in.Bedrooms > maxRoomCount || in.Bathrooms < 0 || in.Bathrooms > maxRoomCount {
		return newValidationError("bedroom and bathroom counts are out of range")
	}
	if in.Floors < 1 || in.Floors > maxFloorCount {
		return newValidationError("floor count is out of range")
	}
	return nil
}

// validatePropertyMedia ensures media references point only to files issued by this server's upload endpoints.
func validatePropertyMedia(in models.PropertyInput) error {
	if in.Model3DPath != "" && !modelPathPattern.MatchString(in.Model3DPath) {
		return newValidationError("3D model path is invalid")
	}
	if len(in.Images) > maxImagesPerListing {
		return newValidationError("too many images; maximum is 20")
	}
	seen := make(map[string]bool, len(in.Images))
	for _, path := range in.Images {
		if !imagePathPattern.MatchString(path) || seen[path] {
			return newValidationError("image list contains an invalid or duplicate path")
		}
		seen[path] = true
	}
	return nil
}

// validateMultilineText validates text that may legitimately contain newlines and tabs.
func validateMultilineText(field, value string, minRunes, maxRunes int) error {
	if containsControlChars(value, true) {
		return newValidationError(field + " contains invalid characters")
	}
	return validateText(field, strings.Map(flattenWhitespace, value), minRunes, maxRunes)
}

// flattenWhitespace converts permitted multiline whitespace into spaces for single-line validation.
func flattenWhitespace(r rune) rune {
	if r == '\n' || r == '\r' || r == '\t' {
		return ' '
	}
	return r
}

// NormalizeWhatsApp converts a phone number into international Indonesian standard format (62xxx).
func NormalizeWhatsApp(phone string) string {
	digits := nonDigitPattern.ReplaceAllString(phone, "")
	if digits == "" {
		return ""
	}
	if strings.HasPrefix(digits, "620") { // "+62 0812…": the trunk 0 must not follow the country code
		return "62" + strings.TrimLeft(digits[2:], "0")
	}
	if strings.HasPrefix(digits, "0") {
		return "62" + strings.TrimLeft(digits, "0")
	}
	if strings.HasPrefix(digits, "62") {
		return digits
	}
	return "62" + digits
}

// IsValidWhatsApp reports whether a normalized number (62 + 8–13 subscriber digits) can receive a wa.me chat.
func IsValidWhatsApp(normalized string) bool {
	return whatsAppPattern.MatchString(normalized)
}

// sanitizeBenefits trims, deduplicates, and caps property benefit highlights.
func sanitizeBenefits(raw []string) []string {
	clean := make([]string, 0, len(raw))
	seen := make(map[string]bool, len(raw))
	for _, item := range raw {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" || len([]rune(trimmed)) > maxBenefitRunes {
			continue
		}
		key := strings.ToLower(trimmed)
		if seen[key] {
			continue
		}
		seen[key] = true
		clean = append(clean, trimmed)
		if len(clean) >= maxBenefitsCount {
			break
		}
	}
	return clean
}

// validatePropertyPin accepts either no map pin or a complete, in-range latitude/longitude pair.
func validatePropertyPin(in models.PropertyInput) error {
	if in.Latitude == nil && in.Longitude == nil {
		return nil
	}
	if in.Latitude == nil || in.Longitude == nil || !validCoordinate(*in.Latitude, *in.Longitude) {
		return newValidationError("titik lokasi peta tidak valid")
	}
	return nil
}
