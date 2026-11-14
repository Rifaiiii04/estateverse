-- 011_create_listing_reports.sql
-- Stores visitor reports about suspicious or incorrect listings (anti-scam safeguard).
-- No foreign key to properties: legacy databases may use unsigned ids; rows are cleaned up by the application.

CREATE TABLE IF NOT EXISTS listing_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    property_id BIGINT NOT NULL,
    reason ENUM('scam', 'wrong_info', 'sold', 'other') NOT NULL,
    note VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_listing_reports_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
