-- 014_add_activity_resource_index.sql
-- Speeds owner history lookups for asynchronous property and room jobs.

ALTER TABLE activity_logs ADD INDEX idx_activity_logs_resource (resource_type, resource_id);
