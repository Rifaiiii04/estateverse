-- 007_add_property_benefits.sql
-- Adds benefits JSON column to store property location advantages and facility highlights.

ALTER TABLE properties ADD COLUMN benefits JSON NULL AFTER model_metadata;

UPDATE properties
SET benefits = JSON_ARRAY(
    '5 Menit ke Akses Gerbang Tol',
    'Dekat Pusat Perbelanjaan & Mall',
    'One Gate System & Keamanan 24 Jam',
    'Lingkungan Bebas Banjir & Asri'
)
WHERE benefits IS NULL;
