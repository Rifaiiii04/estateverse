package handlers

import (
	"encoding/json"
	"net/http"

	"projectfai/backend/internal/models"
	"projectfai/backend/internal/services"
)

// CalibrateCapture estimates the camera lens for an authenticated seller before a new property needs to exist.
func (h *TourHandler) CalibrateCapture(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 12<<20)
	if err := r.ParseMultipartForm(multipartMemoryBytes); err != nil {
		WriteError(w, http.StatusBadRequest, errUploadForm.Error())
		return
	}
	defer r.MultipartForm.RemoveAll()
	var meta models.CaptureMeta
	if err := json.Unmarshal([]byte(r.FormValue("meta")), &meta); err != nil || len(meta.Frames) != 3 || meta.Bands != nil {
		WriteError(w, http.StatusBadRequest, "kalibrasi membutuhkan tiga foto")
		return
	}
	frames, err := readCaptureFrames(r.MultipartForm, meta)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "foto kalibrasi tidak valid")
		return
	}
	result, err := services.CalibrateCapture(frames)
	respond(w, r, http.StatusOK, result, err)
}
