package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path"
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
	if category == CategoryImages {
		return s.saveSanitizedImage(src)
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

// saveSanitizedImage re-encodes an uploaded photo and stores only the clean pixels under a new name.
func (s *localStorageService) saveSanitizedImage(src io.Reader) (string, error) {
	data, err := io.ReadAll(io.LimitReader(src, s.maxFileSize+1))
	if err != nil {
		return "", fmt.Errorf("failed reading uploaded image: %w", err)
	}
	if int64(len(data)) > s.maxFileSize {
		return "", fmt.Errorf("file size exceeds maximum allowed of %d bytes", s.maxFileSize)
	}
	clean, ext, err := sanitizeImageUpload(data)
	if err != nil {
		return "", err
	}
	name, err := generateUniqueFilename(ext)
	if err != nil {
		return "", err
	}
	rel := path.Join(CategoryImages, name)
	if err := s.WriteFile(rel, clean); err != nil {
		return "", fmt.Errorf("failed writing image: %w", err)
	}
	return rel, nil
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

// generateUniqueFilename builds a time-stamped unique filename.
func generateUniqueFilename(ext string) (string, error) {
	rnd := make([]byte, 8)
	if _, err := rand.Read(rnd); err != nil {
		return "", err
	}
	ts := time.Now().Format("20060102150405")
	return fmt.Sprintf("%s_%s%s", ts, hex.EncodeToString(rnd), ext), nil
}
