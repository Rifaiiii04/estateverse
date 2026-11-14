package models

// GroupStats aggregates listings, detail-page views, and leads for one group of listings.
type GroupStats struct {
	Listings int `json:"listings"`
	Views    int `json:"views"`
	Leads    int `json:"leads"`
}

// TourComparison contrasts a seller's listings with and without a ready Walk Inside 360° tour.
type TourComparison struct {
	WithTour    GroupStats `json:"with_tour"`
	WithoutTour GroupStats `json:"without_tour"`
}

// Listing report reasons accepted from visitors.
var ReportReasons = map[string]bool{"scam": true, "wrong_info": true, "sold": true, "other": true}
