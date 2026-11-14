package models

import "time"

// PropertyStatus represents the visibility state of a property.
type PropertyStatus string

const (
	StatusDraft     PropertyStatus = "draft"
	StatusPublished PropertyStatus = "published"
)

// Property represents an individual real estate listing.
type Property struct {
	ID             int64            `json:"id"`
	OwnerID        int64            `json:"-"`
	Title          string           `json:"title"`
	Slug           string           `json:"slug"`
	Description    string           `json:"description"`
	PropertyType   string           `json:"property_type"`
	Price          int64            `json:"price"`
	Address        string           `json:"address"`
	City           string           `json:"city"`
	Province       string           `json:"province"`
	LandArea       int              `json:"land_area"`
	BuildingArea   int              `json:"building_area"`
	Bedrooms       int              `json:"bedrooms"`
	Bathrooms      int              `json:"bathrooms"`
	Floors         int              `json:"floors"`
	WhatsAppNumber string           `json:"whatsapp_number"`
	Model3DPath    string           `json:"model_3d_path"`
	ModelMetadata  *Model3DMetadata `json:"model_metadata,omitempty"`
	Benefits       []string         `json:"benefits"`
	Status         PropertyStatus   `json:"status"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`
	Images         []PropertyImage  `json:"images,omitempty"`
	OwnerName      string           `json:"owner_name,omitempty"`
	HasTour        bool             `json:"has_tour"`
}

// WalkCoordinate specifies a 3D vector for first-person spawn locations.
type WalkCoordinate struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// WalkBoundary defines axis limits to constrain interior player movement.
type WalkBoundary struct {
	MinX float64 `json:"min_x"`
	MaxX float64 `json:"max_x"`
	MinZ float64 `json:"min_z"`
	MaxZ float64 `json:"max_z"`
}

// ModelDimension contains precomputed 3D bounding measurements.
type ModelDimension struct {
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Depth  float64 `json:"depth"`
}

// Model3DMetadata stores backend-computed layout, roof nodes, and interior coordinates.
type Model3DMetadata struct {
	Status     string         `json:"status"`
	RoofNodes  []string       `json:"roof_nodes"`
	WallNodes  []string       `json:"wall_nodes"`
	FloorNodes []string       `json:"floor_nodes"`
	WalkSpawn  WalkCoordinate `json:"walk_spawn"`
	WalkBounds WalkBoundary   `json:"walk_bounds"`
	Dimensions ModelDimension `json:"dimensions"`
}

// PropertyImage represents an uploaded photo attached to a property.
type PropertyImage struct {
	ID         int64     `json:"id"`
	PropertyID int64     `json:"property_id"`
	FilePath   string    `json:"file_path"`
	AltText    string    `json:"alt_text"`
	SortOrder  int       `json:"sort_order"`
	CreatedAt  time.Time `json:"created_at"`
}

// PropertyInput holds the payload for creating or updating a property listing.
type PropertyInput struct {
	Title          string         `json:"title"`
	Description    string         `json:"description"`
	PropertyType   string         `json:"property_type"`
	Price          int64          `json:"price"`
	Address        string         `json:"address"`
	City           string         `json:"city"`
	Province       string         `json:"province"`
	LandArea       int            `json:"land_area"`
	BuildingArea   int            `json:"building_area"`
	Bedrooms       int            `json:"bedrooms"`
	Bathrooms      int            `json:"bathrooms"`
	Floors         int            `json:"floors"`
	WhatsAppNumber string         `json:"whatsapp_number"`
	Model3DPath    string         `json:"model_3d_path"`
	Benefits       []string       `json:"benefits"`
	Status         PropertyStatus `json:"status"`
	Images         []string       `json:"images"`
}

// DashboardSummary represents property metric counters and analytics for the seller dashboard.
type DashboardSummary struct {
	TotalProperties     int            `json:"total_properties"`
	DraftCount          int            `json:"draft_count"`
	PublishedCount      int            `json:"published_count"`
	TotalPortfolioValue int64          `json:"total_portfolio_value"`
	AveragePrice        int64          `json:"average_price"`
	With3DModelCount    int            `json:"with_3d_model_count"`
	TotalLandArea       int            `json:"total_land_area"`
	TotalBuildingArea   int            `json:"total_building_area"`
	SmartScore          int            `json:"smart_score"`
	ListingsWithTour    int            `json:"listings_with_tour"`
	TotalViews          int            `json:"total_views"`
	TotalTourViews      int            `json:"total_tour_views"`
	TotalLeads          int            `json:"total_leads"`
	LeadsViewedTour     int            `json:"leads_viewed_tour"`
	ReportsCount        int            `json:"reports_count"`
	TourComparison      TourComparison `json:"tour_comparison"`
	TypeBreakdown       map[string]int `json:"type_breakdown"`
}

// ImpactStats are platform-wide aggregate counts shown publicly as evidence of impact (no personal data).
type ImpactStats struct {
	ActiveSellers      int `json:"active_sellers"`
	PublishedListings  int `json:"published_listings"`
	ListingsWithTour   int `json:"listings_with_tour"`
	TourRooms          int `json:"tour_rooms"`
	TourViews          int `json:"tour_views"`
	BuyerInquiries     int `json:"buyer_inquiries"`
	InquiriesAfterTour int `json:"inquiries_after_tour"`
}
