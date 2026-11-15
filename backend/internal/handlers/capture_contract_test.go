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
}
type captureRecorder struct {
	services.TourService
	calls []captureCall
}

// StartCapture records exactly the bytes and poses handed to the common backend stitching service.
func (s *captureRecorder) StartCapture(_ context.Context, owner, property int64, name string, frames []services.CaptureFrame) (*models.TourRoom, error) {
	s.calls = append(s.calls, captureCall{owner, property, name, frames})
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
