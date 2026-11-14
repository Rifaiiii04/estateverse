-- 012_add_tour_room_note.sql
-- Adds a short seller note per 360° room (e.g. size and window direction) shown inside the viewer.

ALTER TABLE property_tour_rooms ADD COLUMN note VARCHAR(160) NOT NULL DEFAULT '' AFTER name;
