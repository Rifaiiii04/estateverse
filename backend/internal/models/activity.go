package models

import "time"

// ActivityLogInput contains safe and internal details for one persisted backend activity.
type ActivityLogInput struct {
	UserID       int64
	Action       string
	Status       string
	Method       string
	Path         string
	RequestID    string
	ResourceType string
	ResourceID   int64
	Message      string
	Details      string
	Metadata     map[string]interface{}
	IPAddress    string
	UserAgent    string
}

// ActivityLog is a historical activity record returned to the authenticated owner.
type ActivityLog struct {
	ID           int64                  `json:"id"`
	Action       string                 `json:"action"`
	Status       string                 `json:"status"`
	Method       string                 `json:"method"`
	Path         string                 `json:"path"`
	RequestID    string                 `json:"request_id"`
	ResourceType string                 `json:"resource_type"`
	ResourceID   int64                  `json:"resource_id,omitempty"`
	Message      string                 `json:"message"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
	IPAddress    string                 `json:"ip_address,omitempty"`
	UserAgent    string                 `json:"user_agent,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
}
