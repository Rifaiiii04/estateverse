-- 008_create_property_views.sql
-- Records real buyer engagement events (detail page views and virtual tour opens) for honest dashboard metrics.
-- No foreign key to properties: legacy databases may use unsigned ids; rows are cleaned up by the application.

CREATE TABLE IF NOT EXISTS property_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    property_id BIGINT NOT NULL,
    kind ENUM('detail', 'tour_360', 'tour_3d') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_property_views_property_kind (property_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
