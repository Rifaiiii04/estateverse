-- 009_add_lead_viewed_tour.sql
-- Flags inquiries from buyers who explored the virtual tour before asking for a site visit (SDG 12 evidence).

ALTER TABLE leads ADD COLUMN viewed_tour TINYINT(1) NOT NULL DEFAULT 0 AFTER note;
