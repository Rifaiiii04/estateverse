package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// StorageService defines file upload validation, persistence, and cleanup.
type StorageService interface {
	SaveFile(header *multipart.FileHeader, category string) (string, error)
	WriteFile(relativePath string, data []byte) error
	DeleteFile(relativePath string) error
	RemoveAll(relativeDir string) error
	GetAbsolutePath(relativePath string) (string, error)
}

// Storage categories that may be served publicly; capture frames stay private.
const (
	CategoryImages     = "images"
	CategoryModels     = "models"
	CategoryPanoramas  = "panoramas"
	CategoryTourFrames = "tour_frames"
)

// IsPublicCategory reports whether files under the given top-level folder may be served to visitors.
func IsPublicCategory(relativePath string) bool {
	top := strings.SplitN(filepath.ToSlash(filepath.Clean(relativePath)), "/", 2)[0]
	return top == CategoryImages || top == CategoryModels || top == CategoryPanoramas
}

type localStorageService struct {
	baseDir     string
	maxFileSize int64
}

// NewStorageService instantiates a local filesystem storage service.
func NewStorageService(baseDir string, maxFileSize int64) StorageService {
	for _, dir := range []string{CategoryImages, CategoryModels, CategoryPanoramas, CategoryTourFrames} {
		_ = os.MkdirAll(filepath.Join(baseDir, dir), 0755)
	}
	return &localStorageService{
		baseDir:     baseDir,
		maxFileSize: maxFileSize,
	}
}

// SaveFile validates and saves an uploaded file into category folder.
func (s *localStorageService) SaveFile(header *multipart.FileHeader, category string) (string, error) {
	if header.Size > s.maxFileSize {
		return "", fmt.Errorf("file size exceeds maximum allowed of %d bytes", s.maxFileSize)
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if err := validateCategoryExtension(category, ext); err != nil {
		return "", err
	}

	src, err := header.Open()
	if err != nil {
		return "", fmt.Errorf("failed opening uploaded file: %w", err)
	}
	defer src.Close()

	if err := validateMagicBytes(src, category, ext); err != nil {
		return "", err
	}

	uniqueName, err := generateUniqueFilename(ext)
	if err != nil {
		return "", err
	}

	relPath := filepath.Join(category, uniqueName)
	fullPath := filepath.Join(s.baseDir, relPath)

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed creating target file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed writing file content: %w", err)
	}

	return filepath.ToSlash(relPath), nil
}

// WriteFile stores raw bytes at a sanitized relative path, creating parent folders as needed.
func (s *localStorageService) WriteFile(relativePath string, data []byte) error {
	fullPath, err := s.GetAbsolutePath(relativePath)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return err
	}
	return os.WriteFile(fullPath, data, 0644)
}

// RemoveAll deletes a folder inside storage (used for temporary capture frames).
func (s *localStorageService) RemoveAll(relativeDir string) error {
	fullPath, err := s.GetAbsolutePath(relativeDir)
	if err != nil {
		return err
	}
	absBase, _ := filepath.Abs(s.baseDir)
	if fullPath == absBase {
		return errors.New("refusing to remove storage root")
	}
	return os.RemoveAll(fullPath)
}

// DeleteFile removes a stored file by relative path safely.
func (s *localStorageService) DeleteFile(relativePath string) error {
	fullPath, err := s.GetAbsolutePath(relativePath)
	if err != nil {
		return err
	}
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return nil
	}
	return os.Remove(fullPath)
}

// GetAbsolutePath resolves and sanitizes a relative storage path.
func (s *localStorageService) GetAbsolutePath(relativePath string) (string, error) {
	cleanRel := filepath.Clean(relativePath)
	if strings.HasPrefix(cleanRel, "..") || filepath.IsAbs(cleanRel) {
		return "", errors.New("invalid path traversal attempt")
	}

	full := filepath.Join(s.baseDir, cleanRel)
	absBase, _ := filepath.Abs(s.baseDir)
	absTarget, _ := filepath.Abs(full)

	if !strings.HasPrefix(absTarget, absBase) {
		return "", errors.New("path outside storage boundary")
	}

	return absTarget, nil
}

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

// generateUniqueFilename builds a time-stamped unique filename.
func generateUniqueFilename(ext string) (string, error) {
	rnd := make([]byte, 8)
	if _, err := rand.Read(rnd); err != nil {
		return "", err
	}
	ts := time.Now().Format("20060102150405")
	return fmt.Sprintf("%s_%s%s", ts, hex.EncodeToString(rnd), ext), nil
}
