-- 016_add_property_location_pin.sql
-- Adds the seller-placed map pin used to check that 360° rooms were recorded at the listed house.

ALTER TABLE properties ADD COLUMN latitude DECIMAL(9,6) NULL AFTER province;
ALTER TABLE properties ADD COLUMN longitude DECIMAL(9,6) NULL AFTER latitude;
