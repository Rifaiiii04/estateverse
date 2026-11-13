package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"projectfai/backend/internal/services"
)

// StorageHandler handles file uploads and static asset delivery.
type StorageHandler struct {
	storageSvc services.StorageService
}

// NewStorageHandler instantiates a storage HTTP handler.
func NewStorageHandler(storageSvc services.StorageService) *StorageHandler {
	return &StorageHandler{storageSvc: storageSvc}
}

// UploadImage handles image upload from form multipart payload.
func (h *StorageHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "failed to parse multipart form")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		WriteError(w, http.StatusBadRequest, "missing image file in request")
		return
	}
	defer file.Close()

	relPath, err := h.storageSvc.SaveFile(header, "images")
	if err != nil {
		WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	urlPath := fmt.Sprintf("/api/v1/storage/%s", relPath)
	WriteJSON(w, http.StatusCreated, map[string]string{
		"path": urlPath,
	})
}

// UploadModel handles 3D model (GLB/glTF) upload from form multipart payload.
func (h *StorageHandler) UploadModel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	if err := r.ParseMultipartForm(150 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "failed to parse multipart form")
		return
	}

	file, header, err := r.FormFile("model")
	if err != nil {
		WriteError(w, http.StatusBadRequest, "missing model file in request")
		return
	}
	defer file.Close()

	relPath, err := h.storageSvc.SaveFile(header, "models")
	if err != nil {
		slog.Warn("UploadModel validation failed", "filename", header.Filename, "error", err)
		WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	absPath, err := h.storageSvc.GetAbsolutePath(relPath)
	if err == nil && strings.ToLower(filepath.Ext(absPath)) == ".glb" {
		_ = services.TagGLBArchitecture(absPath)
	}

	urlPath := fmt.Sprintf("/api/v1/storage/%s", relPath)
	WriteJSON(w, http.StatusCreated, map[string]string{
		"path": urlPath,
	})
}

// ServeFile safely serves requested static asset with hardened security headers.
func (h *StorageHandler) ServeFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	relPath := strings.TrimPrefix(r.URL.Path, "/api/v1/storage/")
	absPath, err := h.storageSvc.GetAbsolutePath(relPath)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "invalid file path")
		return
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		WriteError(w, http.StatusNotFound, "file not found")
		return
	}

	ext := strings.ToLower(filepath.Ext(absPath))
	switch ext {
	case ".glb":
		w.Header().Set("Content-Type", "model/gltf-binary")
	case ".gltf":
		w.Header().Set("Content-Type", "model/gltf+json")
	case ".fbx":
		w.Header().Set("Content-Type", "application/octet-stream")
	case ".obj":
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	case ".webp":
		w.Header().Set("Content-Type", "image/webp")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	case ".jpg", ".jpeg":
		w.Header().Set("Content-Type", "image/jpeg")
	}

	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox")
	w.Header().Set("Cache-Control", "public, max-age=86400, immutable")
	http.ServeFile(w, r, absPath)
}
