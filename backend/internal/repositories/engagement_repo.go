package repositories

import (
	"context"
	"database/sql"

	"projectfai/backend/internal/models"
)

// View kinds recorded in property_views.
const (
	ViewDetail  = "detail"
	ViewTour360 = "tour_360"
	ViewTour3D  = "tour_3d"
)

// StatsRepository records buyer engagement and computes public impact figures.
type StatsRepository interface {
	RecordView(ctx context.Context, propertyID int64, kind string) error
	PublicImpact(ctx context.Context) (*models.ImpactStats, error)
	CreateReport(ctx context.Context, propertyID int64, reason, note string) error
}

type mysqlStatsRepo struct {
	db *sql.DB
}

// NewStatsRepository instantiates a MySQL-backed engagement statistics repository.
func NewStatsRepository(db *sql.DB) StatsRepository {
	return &mysqlStatsRepo{db: db}
}

// RecordView stores one real engagement event for a property.
func (r *mysqlStatsRepo) RecordView(ctx context.Context, propertyID int64, kind string) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO property_views (property_id, kind) VALUES (?, ?)`, propertyID, kind)
	return err
}

// PublicImpact aggregates platform-wide counts without exposing any individual's data.
func (r *mysqlStatsRepo) PublicImpact(ctx context.Context) (*models.ImpactStats, error) {
	var s models.ImpactStats
	queries := []struct {
		sql  string
		dest []interface{}
	}{
		{`SELECT COUNT(DISTINCT owner_id), COUNT(*) FROM properties WHERE status = 'published'`,
			[]interface{}{&s.ActiveSellers, &s.PublishedListings}},
		{`SELECT COUNT(DISTINCT t.property_id), COUNT(*) FROM property_tour_rooms t
			JOIN properties p ON p.id = t.property_id WHERE t.status = 'ready' AND p.status = 'published'`,
			[]interface{}{&s.ListingsWithTour, &s.TourRooms}},
		{`SELECT COUNT(*) FROM property_views WHERE kind IN ('tour_360', 'tour_3d')`, []interface{}{&s.TourViews}},
		{`SELECT COUNT(*), CAST(COALESCE(SUM(viewed_tour), 0) AS SIGNED) FROM leads`,
			[]interface{}{&s.BuyerInquiries, &s.InquiriesAfterTour}},
	}
	for _, q := range queries {
		if err := r.db.QueryRowContext(ctx, q.sql).Scan(q.dest...); err != nil {
			return nil, err
		}
	}
	return &s, nil
}

// fillEngagement adds real views, leads, and tour coverage to a seller summary and scores listing completeness.
func (r *mysqlPropertyRepo) fillEngagement(ctx context.Context, ownerID int64, s *models.DashboardSummary) error {
	err := r.db.QueryRowContext(ctx, `SELECT
		CAST(COALESCE(SUM(v.kind = 'detail'), 0) AS SIGNED), CAST(COALESCE(SUM(v.kind <> 'detail'), 0) AS SIGNED)
		FROM property_views v JOIN properties p ON p.id = v.property_id WHERE p.owner_id = ?`, ownerID,
	).Scan(&s.TotalViews, &s.TotalTourViews)
	if err != nil {
		return err
	}
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(*), CAST(COALESCE(SUM(viewed_tour), 0) AS SIGNED)
		FROM leads WHERE owner_id = ?`, ownerID).Scan(&s.TotalLeads, &s.LeadsViewedTour)
	if err != nil {
		return err
	}
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT t.property_id) FROM property_tour_rooms t
		JOIN properties p ON p.id = t.property_id WHERE p.owner_id = ? AND t.status = 'ready'`, ownerID,
	).Scan(&s.ListingsWithTour)
	if err != nil {
		return err
	}
	s.SmartScore = completenessScore(s)
	return r.fillOwnerInsights(ctx, ownerID, s)
}

// completenessScore rewards publishing listings and giving them a 360° tour or 3D model (0..100).
func completenessScore(s *models.DashboardSummary) int {
	if s.TotalProperties == 0 {
		return 0
	}
	withMedia := s.ListingsWithTour
	if s.With3DModelCount > withMedia {
		withMedia = s.With3DModelCount
	}
	mediaRatio := float64(min(withMedia, s.TotalProperties)) / float64(s.TotalProperties)
	pubRatio := float64(s.PublishedCount) / float64(s.TotalProperties)
	return int(40 + mediaRatio*40 + pubRatio*20)
}
