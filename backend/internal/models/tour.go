package models

import "time"

// Tour room processing states.
const (
	TourStatusProcessing = "processing"
	TourStatusReady      = "ready"
	TourStatusFailed     = "failed"
)

// TourRoom is one 360° room of a property's virtual tour.
type TourRoom struct {
	ID           int64         `json:"id"`
	PropertyID   int64         `json:"property_id"`
	Name         string        `json:"name"`
	Note         string        `json:"note"`
	Status       string        `json:"status"`
	PanoramaPath string        `json:"panorama_path"`
	PreviewPath  string        `json:"preview_path"`
	QualityScore int           `json:"quality_score"`
	ErrorMessage string        `json:"error_message,omitempty"`
	SortOrder    int           `json:"sort_order"`
	Hotspots     []TourHotspot `json:"hotspots"`
	CreatedAt    time.Time     `json:"created_at"`
}

// TourHotspot is a clickable marker inside one room that leads to another room.
type TourHotspot struct {
	ID         int64   `json:"id"`
	FromRoomID int64   `json:"from_room_id"`
	ToRoomID   int64   `json:"to_room_id"`
	Yaw        float64 `json:"yaw"`
	Pitch      float64 `json:"pitch"`
}

// CaptureFrameMeta describes one auto-captured photo: its index and device orientation quaternion (w, x, y, z).
type CaptureFrameMeta struct {
	Index       int        `json:"index"`
	Orientation [4]float64 `json:"orientation"`
}

// CaptureMeta is the JSON manifest sent alongside the captured frames of one room.
type CaptureMeta struct {
	Name   string             `json:"name"`
	Frames []CaptureFrameMeta `json:"frames"`
}
