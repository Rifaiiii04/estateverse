package models

import "time"

// Lead represents a potential buyer inquiry submitted for a property.
type Lead struct {
	ID            int64     `json:"id"`
	PropertyID    int64     `json:"property_id"`
	OwnerID       int64     `json:"owner_id"`
	Name          string    `json:"name"`
	Phone         string    `json:"phone"`
	Budget        string    `json:"budget"`
	Note          string    `json:"note"`
	ViewedTour    bool      `json:"viewed_tour"`
	Status        string    `json:"status"`
	PropertyTitle string    `json:"property_title,omitempty"`
	PropertySlug  string    `json:"property_slug,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// LeadInput represents payload for submitting a new buyer inquiry.
type LeadInput struct {
	PropertyID int64  `json:"property_id"`
	Name       string `json:"name"`
	Phone      string `json:"phone"`
	Budget     string `json:"budget"`
	Note       string `json:"note"`
	ViewedTour bool   `json:"viewed_tour"`
}
