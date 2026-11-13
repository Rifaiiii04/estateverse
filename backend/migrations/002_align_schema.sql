-- 002_align_schema.sql
-- Aligns pre-existing database schema with EstateVerse MVP domain models.

ALTER TABLE properties ADD COLUMN slug VARCHAR(220) NOT NULL UNIQUE AFTER title;
ALTER TABLE properties ADD COLUMN property_type VARCHAR(50) NOT NULL DEFAULT 'house' AFTER description;
ALTER TABLE properties CHANGE COLUMN contact_whatsapp whatsapp_number VARCHAR(30) NOT NULL;
ALTER TABLE property_images CHANGE COLUMN image_path file_path VARCHAR(255) NOT NULL;
