package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/go-sql-driver/mysql"
)

// Open establishes and configures a MySQL database connection pool.
func Open(dsn string) (*sql.DB, error) {
	dsn, err := withFoundRows(dsn)
	if err != nil {
		return nil, fmt.Errorf("invalid database DSN: %w", err)
	}
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database handle: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(2 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	return db, nil
}

// withFoundRows makes UPDATE report matched rows instead of changed rows, so saving an unchanged value
// (for example the same lead status) is not mistaken for a missing or foreign record.
func withFoundRows(dsn string) (string, error) {
	cfg, err := mysql.ParseDSN(dsn)
	if err != nil {
		return "", err
	}
	cfg.ClientFoundRows = true
	return cfg.FormatDSN(), nil
}

// HealthCheck verifies if the database connection pool is alive.
func HealthCheck(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return fmt.Errorf("database handle is nil")
	}
	timeoutCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return db.PingContext(timeoutCtx)
}
