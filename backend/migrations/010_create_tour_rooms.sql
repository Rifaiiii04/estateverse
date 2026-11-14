-- 010_create_tour_rooms.sql
-- Stores 360° rooms recorded by sellers (stitched panoramas) and the hotspots linking rooms together.
-- No foreign key to properties: legacy databases may use unsigned ids; rows are cleaned up by the application.

CREATE TABLE IF NOT EXISTS property_tour_rooms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    property_id BIGINT NOT NULL,
    name VARCHAR(60) NOT NULL,
    status ENUM('processing', 'ready', 'failed') NOT NULL DEFAULT 'processing',
    panorama_path VARCHAR(255) NOT NULL DEFAULT '',
    preview_path VARCHAR(255) NOT NULL DEFAULT '',
    quality_score INT NOT NULL DEFAULT 0,
    error_message VARCHAR(255) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tour_rooms_property (property_id, sort_order, id),
    INDEX idx_tour_rooms_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tour_hotspots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    from_room_id BIGINT NOT NULL,
    to_room_id BIGINT NOT NULL,
    yaw DOUBLE NOT NULL,
    pitch DOUBLE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hotspots_from FOREIGN KEY (from_room_id) REFERENCES property_tour_rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_hotspots_to FOREIGN KEY (to_room_id) REFERENCES property_tour_rooms (id) ON DELETE CASCADE,
    INDEX idx_tour_hotspots_from (from_room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
