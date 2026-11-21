-- 015_add_tour_room_measure_and_capture_origin.sql
-- Stores how each 360° room was produced (live sensor capture or imported photo), the camera height used to
-- turn panorama angles into metres, the seller-traced floor outline, and the GPS fix taken while recording.

ALTER TABLE property_tour_rooms ADD COLUMN source ENUM('unknown', 'capture', 'import') NOT NULL DEFAULT 'unknown' AFTER note;
ALTER TABLE property_tour_rooms ADD COLUMN camera_height_cm SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER source;
ALTER TABLE property_tour_rooms ADD COLUMN floor_outline VARCHAR(1024) NOT NULL DEFAULT '[]' AFTER camera_height_cm;
ALTER TABLE property_tour_rooms ADD COLUMN capture_lat DECIMAL(9,6) NULL AFTER floor_outline;
ALTER TABLE property_tour_rooms ADD COLUMN capture_lng DECIMAL(9,6) NULL AFTER capture_lat;
ALTER TABLE property_tour_rooms ADD COLUMN capture_accuracy_m SMALLINT UNSIGNED NULL AFTER capture_lng;
