package services

import "errors"

// Sentinel errors returned by services so handlers can map them to safe HTTP responses.
var (
	ErrNotFound           = errors.New("resource not found")
	ErrConflict           = errors.New("resource already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUnauthenticated    = errors.New("invalid or expired session")
)

// ValidationError describes a client input problem whose message is safe to expose.
type ValidationError struct {
	Message string
}

// Error returns the client-safe validation message.
func (e *ValidationError) Error() string {
	return e.Message
}

// newValidationError builds a ValidationError with the given client-safe message.
func newValidationError(message string) error {
	return &ValidationError{Message: message}
}

// IsValidationError reports whether err (or a wrapped error) is a ValidationError.
func IsValidationError(err error) (*ValidationError, bool) {
	var ve *ValidationError
	if errors.As(err, &ve) {
		return ve, true
	}
	return nil, false
}
