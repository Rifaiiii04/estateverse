-- 017_create_image_fingerprints.sql
-- Keeps a 64-bit perceptual hash (dHash) of every uploaded listing photo so photos reused from another
-- seller's earlier upload can be flagged to buyers.

CREATE TABLE IF NOT EXISTS image_fingerprints (
    file_path VARCHAR(255) NOT NULL PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    dhash BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_image_fingerprints_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_image_fingerprints_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
