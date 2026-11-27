package models

import "time"

// Tour room processing states.
const (
	TourStatusProcessing = "processing"
	TourStatusReady      = "ready"
	TourStatusFailed     = "failed"
)

// Tour room sources: recorded live with the guided sensor capture, or uploaded as a finished 360° photo.
const (
	TourSourceUnknown = "unknown"
	TourSourceCapture = "capture"
	TourSourceImport  = "import"
)

// Location check verdicts telling buyers whether a room was recorded live at the listed house.
const (
	LocationVerified  = "verified"  // live capture whose GPS fix lies within range of the listing pin
	LocationFar       = "far"       // live capture whose GPS fix is clearly away from the listing pin
	LocationImprecise = "imprecise" // GPS accuracy too coarse to decide
	LocationNoGPS     = "no_gps"    // live capture recorded without location permission
	LocationNoPin     = "no_pin"    // the seller has not placed the listing pin yet
	LocationNotLive   = "not_live"  // imported 360° photo or a room recorded before origin tracking
)

// TourRoom is one 360° room of a property's virtual tour.
type TourRoom struct {
	ID             int64         `json:"id"`
	PropertyID     int64         `json:"property_id"`
	Name           string        `json:"name"`
	Note           string        `json:"note"`
	Source         string        `json:"source"`
	CameraHeightCm int           `json:"camera_height_cm"`
	FloorOutline   []FloorPoint  `json:"floor_outline"`
	LocationCheck  string        `json:"location_check"`
	CaptureFix     *GeoFix       `json:"-"`
	Status         string        `json:"status"`
	PanoramaPath   string        `json:"panorama_path"`
	PreviewPath    string        `json:"preview_path"`
	QualityScore   int           `json:"quality_score"`
	ErrorMessage   string        `json:"error_message,omitempty"`
	SortOrder      int           `json:"sort_order"`
	Hotspots       []TourHotspot `json:"hotspots"`
	CreatedAt      time.Time     `json:"created_at"`
}

// TourHotspot is a clickable marker inside one room that leads to another room.
type TourHotspot struct {
	ID         int64   `json:"id"`
	FromRoomID int64   `json:"from_room_id"`
	ToRoomID   int64   `json:"to_room_id"`
	Yaw        float64 `json:"yaw"`
	Pitch      float64 `json:"pitch"`
}

// FloorPoint is one floor corner traced in a panorama, as the yaw/pitch (degrees) seen from the camera.
type FloorPoint struct {
	Yaw   float64 `json:"yaw"`
	Pitch float64 `json:"pitch"`
}

// GeoFix is a GPS reading taken by the phone while a room was being recorded.
type GeoFix struct {
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	AccuracyM int     `json:"accuracy_m"`
}

// RoomLayout is the seller-calibrated geometry that turns a panorama into floor measurements.
type RoomLayout struct {
	CameraHeightCm int          `json:"camera_height_cm"`
	FloorOutline   []FloorPoint `json:"floor_outline"`
}

// CaptureFrameMeta describes one auto-captured photo: its index and device orientation quaternion (w, x, y, z).
type CaptureFrameMeta struct {
	Index       int        `json:"index"`
	Orientation [4]float64 `json:"orientation"`
}

// CaptureBandMeta locates a finished 360-degree sweep on a north-up equirectangular canvas in degrees.
type CaptureBandMeta struct {
	Index    int     `json:"index"`
	Pitch    float64 `json:"pitch"`
	MinPitch float64 `json:"min_pitch"`
	MaxPitch float64 `json:"max_pitch"`
}

// CaptureMeta is the JSON manifest sent alongside the captured frames of one room.
// Camera height and location are optional so older clients keep working.
type CaptureMeta struct {
	CaptureID      string             `json:"capture_id,omitempty"`
	Name           string             `json:"name"`
	Frames         []CaptureFrameMeta `json:"frames,omitempty"`
	Bands          []CaptureBandMeta  `json:"bands,omitempty"`
	CameraHeightCm int                `json:"camera_height_cm,omitempty"`
	Location       *GeoFix            `json:"location,omitempty"`
}
