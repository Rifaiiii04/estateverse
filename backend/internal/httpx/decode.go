package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

// MaxJSONBodyBytes caps JSON request bodies to prevent memory exhaustion.
const MaxJSONBodyBytes int64 = 1 << 20

// ErrBodyTooLarge is returned when the request body exceeds the allowed size.
var ErrBodyTooLarge = errors.New("request body too large")

// ErrInvalidBody is returned when the request body is not a single valid JSON object.
var ErrInvalidBody = errors.New("invalid request body")

// DecodeJSON strictly decodes a single size-limited JSON object into dst.
func DecodeJSON(w http.ResponseWriter, r *http.Request, dst interface{}) error {
	if !isJSONContentType(r.Header.Get("Content-Type")) {
		return ErrInvalidBody
	}

	r.Body = http.MaxBytesReader(w, r.Body, MaxJSONBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			return ErrBodyTooLarge
		}
		return ErrInvalidBody
	}

	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return ErrInvalidBody
	}
	return nil
}

// WriteDecodeError maps a DecodeJSON error to the matching HTTP response.
func WriteDecodeError(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrBodyTooLarge) {
		WriteError(w, http.StatusRequestEntityTooLarge, ErrBodyTooLarge.Error())
		return
	}
	WriteError(w, http.StatusBadRequest, ErrInvalidBody.Error())
}

// isJSONContentType reports whether the Content-Type header declares JSON.
func isJSONContentType(contentType string) bool {
	mediaType := strings.TrimSpace(strings.SplitN(contentType, ";", 2)[0])
	return strings.EqualFold(mediaType, "application/json")
}
