package services_test

import (
	"os"
	"path/filepath"
	"testing"

	"projectfai/backend/internal/services"
)

// TestModelAnalyzerFallback tests fallback metadata generation for non-GLB files.
func TestModelAnalyzerFallback(t *testing.T) {
	analyzer := services.NewModelAnalyzer()
	meta, err := analyzer.Analyze("sample.obj")
	if err != nil {
		t.Fatalf("expected no error for fallback, got %v", err)
	}
	if meta.Status != "ready" {
		t.Errorf("expected status ready, got %s", meta.Status)
	}
	if len(meta.RoofNodes) == 0 {
		t.Errorf("expected default roof nodes, got empty")
	}
}

// TestModelAnalyzerSuburbanHouse verifies analysis against actual uploaded GLB file if present.
func TestModelAnalyzerSuburbanHouse(t *testing.T) {
	analyzer := services.NewModelAnalyzer()
	glbPath := filepath.Join("..", "..", "storage", "uploads", "models", "20261102162816_c648d45935b5ad48.glb")
	if _, err := os.Stat(glbPath); os.IsNotExist(err) {
		t.Skip("sample glb not found in test environment, skipping")
	}

	meta, err := analyzer.Analyze(glbPath)
	if err != nil {
		t.Fatalf("failed analyzing GLB: %v", err)
	}

	t.Logf("Detected RoofNodes: %v", meta.RoofNodes)
	t.Logf("Detected WallNodes: %v", meta.WallNodes)
	t.Logf("Detected Dimensions: %+v", meta.Dimensions)
	t.Logf("Detected WalkSpawn: %+v", meta.WalkSpawn)

	hasRoof := false
	for _, n := range meta.RoofNodes {
		if n == "roof" || n == "roof_roof_0" {
			hasRoof = true
			break
		}
	}
	if !hasRoof {
		t.Errorf("expected 'roof' or 'roof_roof_0' in RoofNodes, got %v", meta.RoofNodes)
	}
}
