-- A recording can be retried after a lost response. Older rooms and imports have no receipt.
ALTER TABLE property_tour_rooms ADD COLUMN capture_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL;
ALTER TABLE property_tour_rooms ADD COLUMN capture_digest BINARY(32) NULL;
ALTER TABLE property_tour_rooms ADD UNIQUE KEY uq_tour_capture_receipt (property_id, capture_id);
