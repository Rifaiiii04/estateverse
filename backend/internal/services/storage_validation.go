package services

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// validateCategoryExtension checks if file extension matches category rules.
func validateCategoryExtension(category, ext string) error {
	switch category {
	case "images":
		allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
		if !allowed[ext] {
			return errors.New("invalid image extension; allowed: .jpg, .jpeg, .png, .webp")
		}
	case "models":
		allowed := map[string]bool{
			".glb": true, ".gltf": true, ".fbx": true, ".obj": true,
		}
		if !allowed[ext] {
			return errors.New("invalid model extension; allowed: .glb, .gltf, .fbx, .obj")
		}
	default:
		return errors.New("unsupported storage category")
	}
	return nil
}

// validateMagicBytes inspects initial bytes to verify genuine file types.
func validateMagicBytes(r io.ReadSeeker, category, ext string) error {
	buf := make([]byte, 512)
	n, err := r.Read(buf)
	if err != nil && err != io.EOF {
		return err
	}
	_, _ = r.Seek(0, io.SeekStart)

	if category == "images" {
		mime := http.DetectContentType(buf[:n])
		validMimes := map[string]bool{
			"image/jpeg": true, "image/png": true, "image/webp": true,
		}
		if !validMimes[mime] {
			return fmt.Errorf("invalid image content detected: %s", mime)
		}
	} else if category == "models" {
		switch ext {
		case ".glb":
			if n < 4 || string(buf[:4]) != "glTF" {
				return errors.New("file is not a valid binary glTF (GLB)")
			}
		case ".fbx":
			content := string(buf[:n])
			if !strings.HasPrefix(content, "Kaydara FBX Binary") && !strings.Contains(content, "FBX") {
				return errors.New("file is not a valid FBX model")
			}
		case ".obj":
			content := string(buf[:n])
			if !strings.Contains(content, "v ") && !strings.Contains(content, "#") && !strings.Contains(content, "mtllib") {
				return errors.New("file is not a valid OBJ model")
			}
		}
	}
	return nil
}
