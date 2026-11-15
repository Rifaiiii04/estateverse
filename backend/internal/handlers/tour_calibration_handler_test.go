package handlers

import (
	"bytes"
	"encoding/json"
	"image"
	"image/jpeg"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"testing"

	"projectfai/backend/internal/middleware"
	"projectfai/backend/internal/models"
	"projectfai/backend/internal/panorama"
)

// calibrationRequest encodes three genuine JPEGs without requiring an existing property.
func calibrationRequest(t *testing.T, native bool) *http.Request {
	t.Helper()
	var jpegData, body bytes.Buffer
	if err := jpeg.Encode(&jpegData, image.NewRGBA(image.Rect(0, 0, 240, 426)), nil); err != nil {
		t.Fatal(err)
	}
	w := multipart.NewWriter(&body)
	meta := models.CaptureMeta{Name: "calibration"}
	for i := 0; i < 3; i++ {
		part, err := w.CreateFormFile("frame_"+strconv.Itoa(i), "frame.jpg")
		if err != nil {
			t.Fatal(err)
		}
		if _, err = part.Write(jpegData.Bytes()); err != nil {
			t.Fatal(err)
		}
		meta.Frames = append(meta.Frames, models.CaptureFrameMeta{Index: i, Orientation: [4]float64{1, 0, 0, 0}})
	}
	data, _ := json.Marshal(meta)
	_ = w.WriteField("meta", string(data))
	_ = w.Close()
	r := httptest.NewRequest(http.MethodPost, "/api/v1/tours/calibration", &body)
	r.Header.Set("Content-Type", w.FormDataContentType())
	if native {
		r.Header.Set("Authorization", "Bearer dummy_token_123")
	} else {
		r.AddCookie(&http.Cookie{Name: "session_token", Value: "dummy_token_123"})
	}
	return r
}

// TestCalibrationClientParity verifies both clients get the same measured plan before a property exists.
func TestCalibrationClientParity(t *testing.T) {
	h := NewTourHandler(&captureRecorder{})
	auth := &dummyAuthService{user: &models.User{ID: 7, Role: "seller"}}
	handler := middleware.RequireAuth(auth)(http.HandlerFunc(h.CalibrateCapture))
	var plans []panorama.Calibration
	for _, native := range []bool{false, true} {
		r, rec := calibrationRequest(t, native), httptest.NewRecorder()
		handler.ServeHTTP(rec, r)
		if rec.Code != http.StatusOK {
			t.Fatalf("calibration failed: %d %s", rec.Code, rec.Body.String())
		}
		var result struct {
			Data panorama.Calibration `json:"data"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result.Data.Calibrated || len(result.Data.Targets) < 8 {
			t.Fatal("blank photos should use a conservative plan")
		}
		plans = append(plans, result.Data)
	}
	if !reflect.DeepEqual(plans[0], plans[1]) {
		t.Fatal("web and native received different plans")
	}
	r, rec := calibrationRequest(t, true), httptest.NewRecorder()
	r.Header.Del("Authorization")
	handler.ServeHTTP(rec, r)
	if rec.Code != http.StatusUnauthorized {
		t.Fatal("anonymous calibration was accepted")
	}
	r, rec = captureRequest(t, 3, true), httptest.NewRecorder()
	handler.ServeHTTP(rec, r)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatal("invalid calibration JPEG was accepted")
	}
}
