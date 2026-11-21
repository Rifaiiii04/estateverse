package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/services"
)

const (
	maxCaptureRequestBytes = 120 << 20
	maxImportRequestBytes  = 45 << 20
	multipartMemoryBytes   = 16 << 20
	maxFrameReadBytes      = 3<<20 + 1
	maxImportReadBytes     = 40<<20 + 1
)

// errUploadForm signals a malformed or oversized multipart upload.
var errUploadForm = errors.New("upload tidak valid atau terlalu besar")

// CreateCapture receives auto-captured frames plus orientation manifest and queues stitching.
func (h *TourHandler) CreateCapture(w http.ResponseWriter, r *http.Request) {
	propertyID, meta, ok := parseCaptureForm(w, r)
	if !ok {
		return
	}
	frames, err := readCaptureFrames(r.MultipartForm, meta)
	if err != nil {
		WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	extras := services.CaptureExtras{CameraHeightCm: meta.CameraHeightCm, Location: meta.Location}
	room, err := h.tours.StartCapture(r.Context(), currentUserID(r), propertyID, meta.Name, frames, extras)
	respond(w, r, http.StatusAccepted, room, err)
}

// ImportPanorama receives a ready-made equirectangular photo as a room.
func (h *TourHandler) ImportPanorama(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxImportRequestBytes)
	if err := r.ParseMultipartForm(multipartMemoryBytes); err != nil {
		WriteError(w, http.StatusBadRequest, errUploadForm.Error())
		return
	}
	propertyID, err := strconv.ParseInt(r.FormValue("property_id"), 10, 64)
	if err != nil || propertyID <= 0 {
		WriteError(w, http.StatusBadRequest, "invalid property_id")
		return
	}
	data, err := readFormFile(r.MultipartForm, "panorama", maxImportReadBytes)
	if err != nil {
		WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	room, err := h.tours.ImportPanorama(r.Context(), currentUserID(r), propertyID, r.FormValue("name"), data)
	respond(w, r, http.StatusCreated, room, err)
}

// parseCaptureForm bounds the request size and decodes the property id and capture manifest.
func parseCaptureForm(w http.ResponseWriter, r *http.Request) (int64, models.CaptureMeta, bool) {
	var meta models.CaptureMeta
	r.Body = http.MaxBytesReader(w, r.Body, maxCaptureRequestBytes)
	if err := r.ParseMultipartForm(multipartMemoryBytes); err != nil {
		WriteError(w, http.StatusBadRequest, errUploadForm.Error())
		return 0, meta, false
	}
	propertyID, err := strconv.ParseInt(r.FormValue("property_id"), 10, 64)
	if err != nil || propertyID <= 0 {
		WriteError(w, http.StatusBadRequest, "invalid property_id")
		return 0, meta, false
	}
	if err := json.Unmarshal([]byte(r.FormValue("meta")), &meta); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid capture manifest")
		return 0, meta, false
	}
	return propertyID, meta, true
}

// readCaptureFrames loads each frame file named in the manifest, in manifest order.
func readCaptureFrames(form *multipart.Form, meta models.CaptureMeta) ([]services.CaptureFrame, error) {
	if len(meta.Frames) == 0 || len(meta.Frames) > 64 {
		return nil, errors.New("jumlah foto pada manifest tidak valid")
	}
	frames := make([]services.CaptureFrame, 0, len(meta.Frames))
	for _, fm := range meta.Frames {
		data, err := readFormFile(form, fmt.Sprintf("frame_%d", fm.Index), maxFrameReadBytes)
		if err != nil {
			return nil, err
		}
		frames = append(frames, services.CaptureFrame{Data: data, Orientation: fm.Orientation})
	}
	return frames, nil
}

// readFormFile reads one uploaded file fully, rejecting files above the byte limit.
func readFormFile(form *multipart.Form, field string, limit int64) ([]byte, error) {
	files := form.File[field]
	if len(files) != 1 {
		return nil, fmt.Errorf("file %s tidak ditemukan", field)
	}
	f, err := files[0].Open()
	if err != nil {
		return nil, errUploadForm
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, limit))
	if err != nil || int64(len(data)) >= limit {
		return nil, fmt.Errorf("file %s terlalu besar", field)
	}
	return data, nil
}
