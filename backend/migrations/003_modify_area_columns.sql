-- 003_modify_area_columns.sql
-- Converts land_area and building_area to integer types.

ALTER TABLE properties MODIFY COLUMN land_area INT NOT NULL;
ALTER TABLE properties MODIFY COLUMN building_area INT NOT NULL;
