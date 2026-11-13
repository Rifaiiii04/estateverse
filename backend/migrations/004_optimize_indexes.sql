-- 004_optimize_indexes.sql
-- Adds composite indexes for high-performance listing pagination and batch image retrieval.

CREATE INDEX idx_properties_published_feed ON properties (status, created_at, id);
CREATE INDEX idx_properties_owner_feed ON properties (owner_id, updated_at, id);
CREATE INDEX idx_property_images_batch ON property_images (property_id, sort_order, id);
