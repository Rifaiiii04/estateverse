package services

import (
	"net/mail"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	minNameRunes      = 2
	maxNameRunes      = 100
	maxEmailBytes     = 191
	minPasswordRunes  = 8
	maxPasswordBytes  = 72 // bcrypt only uses the first 72 bytes.
	sessionTokenBytes = 32
)

// normalizeEmail trims and lowercases an email address for consistent lookups.
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// validateRegisterInput validates registration fields against length and format rules.
func validateRegisterInput(name, email, password, confirm string) error {
	if err := validateText("name", name, minNameRunes, maxNameRunes); err != nil {
		return err
	}
	if err := validateEmail(email); err != nil {
		return err
	}
	if utf8.RuneCountInString(password) < minPasswordRunes {
		return newValidationError("password must be at least 8 characters")
	}
	if len(password) > maxPasswordBytes {
		return newValidationError("password must be at most 72 bytes")
	}
	if password != confirm {
		return newValidationError("passwords do not match")
	}
	return nil
}

// validateEmail ensures the value is a bare RFC 5322 address within storage limits.
func validateEmail(email string) error {
	if email == "" || len(email) > maxEmailBytes {
		return newValidationError("invalid email format")
	}
	parsed, err := mail.ParseAddress(email)
	if err != nil || parsed.Address != email || parsed.Name != "" {
		return newValidationError("invalid email format")
	}
	return nil
}

// validateText checks that a trimmed value is valid UTF-8, free of control characters, and within rune bounds.
func validateText(field, value string, minRunes, maxRunes int) error {
	if !utf8.ValidString(value) || containsControlChars(value, false) {
		return newValidationError(field + " contains invalid characters")
	}
	count := utf8.RuneCountInString(value)
	if count < minRunes || count > maxRunes {
		return newValidationError(field + " length is out of the allowed range")
	}
	return nil
}

// containsControlChars reports whether the value has control characters, optionally allowing newlines and tabs.
func containsControlChars(value string, allowMultiline bool) bool {
	for _, r := range value {
		if allowMultiline && (r == '\n' || r == '\r' || r == '\t') {
			continue
		}
		if unicode.IsControl(r) {
			return true
		}
	}
	return false
}

// isWellFormedToken reports whether a raw session token has the expected hex length before hitting the database.
func isWellFormedToken(token string) bool {
	if len(token) != sessionTokenBytes*2 {
		return false
	}
	for i := 0; i < len(token); i++ {
		c := token[i]
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
			return false
		}
	}
	return true
}
