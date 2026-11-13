package models

import "time"

// Session represents an authenticated user's server-side session.
type Session struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// IsExpired checks whether the session timestamp has lapsed.
func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}
