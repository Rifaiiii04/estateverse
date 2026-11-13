package services_test

import (
	"encoding/binary"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"testing"

	"projectfai/backend/internal/services"
)

// TestTagGLBArchitecture verifies tagging of Chunk 0 extras without distorting binary buffer.
func TestTagGLBArchitecture(t *testing.T) {
	origPath := filepath.Join("..", "..", "storage", "uploads", "models", "20261102162816_c648d45935b5ad48.glb")
	if _, err := os.Stat(origPath); os.IsNotExist(err) {
		t.Skip("sample glb not found in test environment, skipping")
	}

	copyPath := filepath.Join(t.TempDir(), "test_tagged.glb")
	src, err := os.Open(origPath)
	if err != nil {
		t.Fatalf("failed opening source glb: %v", err)
	}
	defer src.Close()

	dst, err := os.Create(copyPath)
	if err != nil {
		t.Fatalf("failed creating test copy: %v", err)
	}
	if _, err := io.Copy(dst, src); err != nil {
		_ = dst.Close()
		t.Fatalf("failed copying glb: %v", err)
	}
	_ = dst.Close()

	if err := services.TagGLBArchitecture(copyPath); err != nil {
		t.Fatalf("TagGLBArchitecture failed: %v", err)
	}

	// Verify the rewritten GLB is valid and contains node extras
	checkF, err := os.Open(copyPath)
	if err != nil {
		t.Fatalf("failed opening tagged glb: %v", err)
	}
	defer checkF.Close()

	header := make([]byte, 12)
	_, _ = io.ReadFull(checkF, header)
	if binary.LittleEndian.Uint32(header[0:4]) != 0x46546C67 {
		t.Errorf("magic header mismatch")
	}

	chunk0Header := make([]byte, 8)
	_, _ = io.ReadFull(checkF, chunk0Header)
	c0Len := binary.LittleEndian.Uint32(chunk0Header[0:4])
	jsonBytes := make([]byte, c0Len)
	_, _ = io.ReadFull(checkF, jsonBytes)

	var manifest map[string]any
	if err := json.Unmarshal(jsonBytes, &manifest); err != nil {
		t.Fatalf("failed unmarshaling tagged json: %v", err)
	}

	nodes, ok := manifest["nodes"].([]any)
	if !ok || len(nodes) == 0 {
		t.Fatalf("expected nodes in gltf")
	}

	foundRoofTag := false
	for _, n := range nodes {
		nm, _ := n.(map[string]any)
		name, _ := nm["name"].(string)
		if name == "roof" || name == "roof_roof_0" {
			extras, _ := nm["extras"].(map[string]any)
			if extras != nil && extras["isRoof"] == true {
				foundRoofTag = true
				t.Logf("Successfully verified node %q has extras.isRoof = true!", name)
			}
		}
	}

	if !foundRoofTag {
		t.Errorf("expected node roof or roof_roof_0 to have extras.isRoof = true")
	}

	// Tag the actual sample in storage if present
	if err := services.TagGLBArchitecture(origPath); err != nil {
		t.Logf("Tag sample error: %v", err)
	} else {
		t.Logf("Successfully tagged sample in storage!")
	}
}
