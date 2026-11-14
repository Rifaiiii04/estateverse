package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
)

// alreadyAppliedErrors are MySQL error codes meaning a schema change already exists in the database.
var alreadyAppliedErrors = map[uint16]bool{
	1050: true, // table already exists
	1060: true, // duplicate column name
	1061: true, // duplicate key name
	1091: true, // cannot drop: field or key does not exist
	1826: true, // duplicate foreign key constraint name
}

// EnsureMigrationsTable creates the schema migrations tracker table if missing.
func EnsureMigrationsTable(ctx context.Context, db *sql.DB) error {
	query := `CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(255) PRIMARY KEY,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
	_, err := db.ExecContext(ctx, query)
	return err
}

// RunMigrations executes pending SQL migration files from the specified folder.
func RunMigrations(ctx context.Context, db *sql.DB, migrationsDir string) error {
	if err := EnsureMigrationsTable(ctx, db); err != nil {
		return fmt.Errorf("failed to init migrations table: %w", err)
	}

	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		return fmt.Errorf("failed to read migrations dir: %w", err)
	}
	sort.Strings(files)

	for _, file := range files {
		baseName := filepath.Base(file)
		applied, err := isMigrationApplied(ctx, db, baseName)
		if err != nil {
			return err
		}
		if applied {
			continue
		}
		if err := applyMigrationFile(ctx, db, file, baseName); err != nil {
			return fmt.Errorf("failed applying %s: %w", baseName, err)
		}
	}
	return nil
}

// isMigrationApplied checks if a given migration filename was recorded in the database.
func isMigrationApplied(ctx context.Context, db *sql.DB, version string) (bool, error) {
	var count int
	query := "SELECT COUNT(*) FROM schema_migrations WHERE version = ?"
	err := db.QueryRowContext(ctx, query, version).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// applyMigrationFile reads and executes an SQL migration file in individual statements.
func applyMigrationFile(ctx context.Context, db *sql.DB, filePath, version string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	statements := splitSQLStatements(string(content))
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		execCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		_, err := db.ExecContext(execCtx, stmt)
		cancel()
		if err == nil {
			continue
		}
		if !isAlreadyApplied(err, stmt) {
			return fmt.Errorf("exec statement failed: %w (stmt: %s)", err, stmt)
		}
		log.Printf("[migrate] %s: skipping statement already reflected in schema: %v", version, err)
	}

	recordQuery := "INSERT INTO schema_migrations (version) VALUES (?)"
	_, err = db.ExecContext(ctx, recordQuery, version)
	return err
}

// splitSQLStatements splits raw SQL file content by semicolon, omitting comments.
func splitSQLStatements(sqlContent string) []string {
	var statements []string
	var current strings.Builder

	lines := strings.Split(sqlContent, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		current.WriteString(line)
		current.WriteString("\n")
		if strings.HasSuffix(trimmed, ";") {
			statements = append(statements, current.String())
			current.Reset()
		}
	}
	if current.Len() > 0 {
		leftover := strings.TrimSpace(current.String())
		if leftover != "" {
			statements = append(statements, leftover)
		}
	}
	return statements
}

// isAlreadyApplied reports whether a failed statement only failed because the schema already matches,
// which happens when a fresh database created by 001 meets the legacy alignment migration 002.
func isAlreadyApplied(err error, stmt string) bool {
	var me *mysql.MySQLError
	if !errors.As(err, &me) {
		return false
	}
	if alreadyAppliedErrors[me.Number] {
		return true
	}
	legacyRename := strings.Contains(strings.ToUpper(stmt), "CHANGE COLUMN")
	return me.Number == 1054 && legacyRename // legacy column to rename does not exist on fresh schemas
}
