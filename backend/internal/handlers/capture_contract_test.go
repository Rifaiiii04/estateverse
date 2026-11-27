package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"testing"

	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/services"
)

type captureCall struct {
	owner, property int64
	name            string
	frames          []services.CaptureFrame
	captureID       string
}
type captureRecorder struct {
	services.TourService
	calls []captureCall
}

// StartCapture records exactly the bytes and poses handed to the common backend stitching service.
func (s *captureRecorder) StartCapture(_ context.Context, owner, property int64, name string, frames []services.CaptureFrame,
	extras services.CaptureExtras) (*models.TourRoom, error) {
	s.calls = append(s.calls, captureCall{owner, property, name, frames, extras.CaptureID})
	return &models.TourRoom{ID: 19, PropertyID: property, Name: name, Status: models.TourStatusProcessing}, nil
}

// captureRequest creates the common multipart JPEG/manifest contract independent of client platform.
func captureRequest(t *testing.T, count int, native bool) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	meta := models.CaptureMeta{Name: "Kamar"}
	for i := 0; i < count; i++ {
		file, err := w.CreateFormFile("frame_"+strconv.Itoa(i), "frame.jpg")
		if err != nil {
			t.Fatal(err)
		}
		_, _ = file.Write([]byte{0xff, 0xd8, byte(i), 0xff, 0xd9})
		meta.Frames = append(meta.Frames, models.CaptureFrameMeta{Index: i, Orientation: [4]float64{1, 0, 0, 0}})
	}
	data, _ := json.Marshal(meta)
	_ = w.WriteField("meta", string(data))
	_ = w.WriteField("property_id", "42")
	_ = w.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tours/captures", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	if native {
		req.Header.Set("Authorization", "Bearer dummy_token_123")
	} else {
		req.AddCookie(&http.Cookie{Name: "session_token", Value: "dummy_token_123"})
	}
	return req
}

// TestCaptureClientParity proves native bearer and web cookie requests enter the same service with identical JPEGs and orientations.
func TestCaptureClientParity(t *testing.T) {
	for _, count := range []int{24, 42} {
		svc := &captureRecorder{}
		h := NewTourHandler(svc)
		auth := &dummyAuthService{user: &models.User{ID: 7, Role: "seller"}}
		handler := middleware.RequireAuth(auth)(http.HandlerFunc(h.CreateCapture))
		for _, native := range []bool{false, true} {
			req, rec := captureRequest(t, count, native), httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if req.MultipartForm != nil {
				_ = req.MultipartForm.RemoveAll()
			}
			if rec.Code != http.StatusAccepted {
				t.Fatalf("capture failed: %d %s", rec.Code, rec.Body.String())
			}
		}
		if len(svc.calls) != 2 || !reflect.DeepEqual(svc.calls[0], svc.calls[1]) || svc.calls[0].owner != 7 {
			t.Fatal("web and native captures diverged before backend processing")
		}
		req, rec := captureRequest(t, count, true), httptest.NewRecorder()
		req.Header.Del("Authorization")
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized || len(svc.calls) != 2 {
			t.Fatal("anonymous captures reached stitching")
		}
	}
}

// bandRequest creates one multipart field per completed strip, with optional legacy frames for validation tests.
func bandRequest(t *testing.T, bands []models.CaptureBandMeta, mixed bool) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	meta := models.CaptureMeta{Name: "Kamar", Bands: bands, CaptureID: "f47dc944-a7b2-4dcb-8eeb-27d286b51526"}
	if mixed {
		meta.Frames = []models.CaptureFrameMeta{{Index: 0, Orientation: [4]float64{1, 0, 0, 0}}}
	}
	for i := range bands {
		file, err := writer.CreateFormFile("frame_"+strconv.Itoa(i), "band.jpg")
		if err != nil {
			t.Fatal(err)
		}
		_, _ = file.Write([]byte{0xff, 0xd8, byte(i), 0xff, 0xd9})
	}
	data, _ := json.Marshal(meta)
	_ = writer.WriteField("meta", string(data))
	_ = writer.WriteField("property_id", "42")
	_ = writer.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tours/captures", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.AddCookie(&http.Cookie{Name: "session_token", Value: "dummy_token_123"})
	return req
}

// TestBandCaptureContract accepts three to five band descriptors and rejects malformed manifests before queueing.
func TestBandCaptureContract(t *testing.T) {
	svc := &captureRecorder{}
	auth := &dummyAuthService{user: &models.User{ID: 7, Role: "seller"}}
	handler := middleware.RequireAuth(auth)(http.HandlerFunc(NewTourHandler(svc).CreateCapture))
	for _, tc := range []struct {
		count                   int
		mixed, repeated, accept bool
	}{
		{3, false, false, true}, {4, false, false, true}, {5, false, false, true},
		{2, false, false, false}, {6, false, false, false}, {3, true, false, false}, {3, false, true, false},
	} {
		bands := make([]models.CaptureBandMeta, tc.count)
		for i := range bands {
			bands[i] = models.CaptureBandMeta{Index: i, Pitch: float64(i) * 20}
		}
		if tc.repeated {
			bands[1].Index = 0
		}
		req := bandRequest(t, bands, tc.mixed)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if req.MultipartForm != nil {
			_ = req.MultipartForm.RemoveAll()
		}
		if !tc.accept {
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("invalid manifest %+v returned %d", tc, rec.Code)
			}
			continue
		}
		if rec.Code != http.StatusAccepted {
			t.Fatalf("band request rejected: %s", rec.Body.String())
		}
		last := svc.calls[len(svc.calls)-1]
		if last.captureID != "f47dc944-a7b2-4dcb-8eeb-27d286b51526" {
			t.Fatal("capture receipt was lost in the multipart handler")
		}
		if len(last.frames) != tc.count || !reflect.DeepEqual(*last.frames[1].Band, bands[1]) {
			t.Fatalf("band geometry lost: %+v", last.frames)
		}
	}
}
