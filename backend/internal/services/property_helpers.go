package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/repositories"
)

// generateSlug creates an URL-safe slug with random suffix for uniqueness.
func generateSlug(title string) string {
	reg := regexp.MustCompile("[^a-zA-Z0-9]+")
	slug := strings.ToLower(reg.ReplaceAllString(title, "-"))
	slug = strings.Trim(slug, "-")
	if len(slug) > 180 {
		slug = slug[:180]
	}
	rnd := make([]byte, 4)
	_, _ = rand.Read(rnd)
	return fmt.Sprintf("%s-%s", slug, hex.EncodeToString(rnd))
}

// attachPropertyImagesBatch hydrates images for a list of properties in a single database lookup.
func attachPropertyImagesBatch(ctx context.Context, repo repositories.PropertyImageRepository, props []models.Property) error {
	ids := make([]int64, len(props))
	for i := range props {
		ids[i] = props[i].ID
	}

	imgMap, err := repo.GetByPropertyIDs(ctx, ids)
	if err != nil {
		return err
	}

	for i := range props {
		props[i].Images = imgMap[props[i].ID]
	}
	return nil
}
