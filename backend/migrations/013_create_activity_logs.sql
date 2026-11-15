-- 013_create_activity_logs.sql
-- Persists HTTP and background activity so failures remain traceable after a restart.

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id BIGINT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    method VARCHAR(10) NOT NULL DEFAULT '',
    path VARCHAR(255) NOT NULL DEFAULT '',
    request_id VARCHAR(80) NOT NULL DEFAULT '',
    resource_type VARCHAR(80) NOT NULL DEFAULT '',
    resource_id BIGINT NULL,
    message VARCHAR(500) NOT NULL DEFAULT '',
    details TEXT NULL,
    metadata JSON NULL,
    ip_address VARCHAR(64) NOT NULL DEFAULT '',
    user_agent VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_activity_logs_actor_created (actor_user_id, created_at),
    INDEX idx_activity_logs_action_created (action, created_at),
    INDEX idx_activity_logs_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
