-- 005_add_model_metadata.sql
-- Adds model_metadata column to store backend precomputed 3D roof nodes, dimensions, and interior walk coordinates.

ALTER TABLE properties ADD COLUMN model_metadata JSON NULL AFTER model_3d_path;
