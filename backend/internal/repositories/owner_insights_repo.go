package repositories

import (
	"context"

	"projectfai/backend/internal/models"
)

// fillOwnerInsights adds visitor report counts and the with/without Walk Inside comparison to a seller summary.
func (r *mysqlPropertyRepo) fillOwnerInsights(ctx context.Context, ownerID int64, s *models.DashboardSummary) error {
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM listing_reports lr
		JOIN properties p ON p.id = lr.property_id WHERE p.owner_id = ?`, ownerID).Scan(&s.ReportsCount)
	if err != nil {
		return err
	}
	return r.fillTourComparison(ctx, ownerID, &s.TourComparison)
}

// fillTourComparison groups the seller's listings by whether they have a ready 360° room and sums views and leads.
func (r *mysqlPropertyRepo) fillTourComparison(ctx context.Context, ownerID int64, c *models.TourComparison) error {
	rows, err := r.db.QueryContext(ctx, `SELECT
		EXISTS(SELECT 1 FROM property_tour_rooms t WHERE t.property_id = p.id AND t.status = 'ready') AS has_tour,
		COUNT(*),
		CAST(COALESCE(SUM((SELECT COUNT(*) FROM property_views v WHERE v.property_id = p.id AND v.kind = 'detail')), 0) AS SIGNED),
		CAST(COALESCE(SUM((SELECT COUNT(*) FROM leads l WHERE l.property_id = p.id)), 0) AS SIGNED)
		FROM properties p WHERE p.owner_id = ? AND p.status = 'published'
		GROUP BY has_tour`, ownerID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var hasTour bool
		var g models.GroupStats
		if err := rows.Scan(&hasTour, &g.Listings, &g.Views, &g.Leads); err != nil {
			return err
		}
		if hasTour {
			c.WithTour = g
		} else {
			c.WithoutTour = g
		}
	}
	return rows.Err()
}

// CreateReport stores a visitor's report about a listing.
func (r *mysqlStatsRepo) CreateReport(ctx context.Context, propertyID int64, reason, note string) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO listing_reports (property_id, reason, note) VALUES (?, ?, ?)`,
		propertyID, reason, note)
	return err
}
