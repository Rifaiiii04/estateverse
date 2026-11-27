package repositories

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"net"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/go-sql-driver/mysql"
	"projectfai/backend/internal/models"
)

const testCaptureID = "b62619ed-4fa2-45c6-b45e-20b5544725c0"

// captureTestDatabase creates a uniquely named disposable schema on an explicitly selected local MySQL instance.
func captureTestDatabase(t *testing.T) *mysql.Config {
	t.Helper()
	dsn := os.Getenv("ESTATEVERSE_TEST_MYSQL_DSN")
	if dsn == "" {
		t.Skip("set ESTATEVERSE_TEST_MYSQL_DSN to test receipts on a disposable local MySQL server")
	}
	cfg, err := mysql.ParseDSN(dsn)
	if err != nil {
		t.Fatal("invalid test MySQL DSN")
	}
	host, _, err := net.SplitHostPort(cfg.Addr)
	if err != nil || cfg.Net != "tcp" || (host != "localhost" && !net.ParseIP(host).IsLoopback()) {
		t.Fatal("the receipt test requires a local TCP MySQL server")
	}
	cfg.DBName, cfg.ParseTime, cfg.MultiStatements = "", true, true
	cfg.Timeout, cfg.ReadTimeout, cfg.WriteTimeout = 5*time.Second, 30*time.Second, 30*time.Second
	admin := openReceiptDB(t, cfg)
	var token [8]byte
	if _, err := rand.Read(token[:]); err != nil {
		t.Fatal(err)
	}
	name := "estateverse_capture_test_" + hex.EncodeToString(token[:])
	execReceiptSQL(t, admin, "CREATE DATABASE "+name)
	t.Cleanup(func() { execReceiptSQL(t, admin, "DROP DATABASE "+name) })
	cfg.DBName = name
	return cfg
}

// openReceiptDB opens a new independent connection pool and releases it after the test.
func openReceiptDB(t *testing.T, cfg *mysql.Config) *sql.DB {
	t.Helper()
	db, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

// execReceiptSQL runs a fixture statement and fails the test on database errors.
func execReceiptSQL(t *testing.T, db *sql.DB, query string) {
	t.Helper()
	if _, err := db.ExecContext(context.Background(), query); err != nil {
		t.Fatal(err)
	}
}

// applyReceiptMigration executes the actual repository migration SQL against the disposable schema.
func applyReceiptMigration(t *testing.T, db *sql.DB, file string) {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "..", "migrations", file))
	if err != nil {
		t.Fatal(err)
	}
	execReceiptSQL(t, db, string(data))
}

// createReceiptFixture migrates existing room rows from their pre-receipt schema and retains a published listing.
func createReceiptFixture(t *testing.T, db *sql.DB) {
	t.Helper()
	execReceiptSQL(t, db, "CREATE TABLE properties(id BIGINT PRIMARY KEY, owner_id BIGINT NOT NULL, status VARCHAR(16) NOT NULL) ENGINE=InnoDB")
	execReceiptSQL(t, db, "INSERT INTO properties VALUES(3,7,'published')")
	for _, file := range []string{"010_create_tour_rooms.sql", "012_add_tour_room_note.sql", "015_add_tour_room_measure_and_capture_origin.sql"} {
		applyReceiptMigration(t, db, file)
	}
	execReceiptSQL(t, db, "INSERT INTO property_tour_rooms(property_id,name,status) VALUES(3,'A','ready'),(3,'B','ready')")
	applyReceiptMigration(t, db, "019_add_tour_capture_receipt.sql")
	var legacy int
	if err := db.QueryRow("SELECT COUNT(*) FROM property_tour_rooms WHERE capture_id IS NULL AND capture_digest IS NULL").Scan(&legacy); err != nil || legacy != 2 {
		t.Fatalf("legacy null receipts = %d, err = %v", legacy, err)
	}
}

// submitReceipt submits identical metadata from independent application calls to the real repository.
func submitReceipt(ctx context.Context, repo TourRepository, digest [32]byte, store func(int64) error) (models.TourRoom, bool, error) {
	room := models.TourRoom{PropertyID: 3, Name: "Ruang Uji", Status: models.TourStatusProcessing, Source: models.TourSourceCapture}
	created, err := repo.AcceptCapture(ctx, 7, &room, testCaptureID, digest[:], store)
	return room, created, err
}

// TestMySQLCaptureReceipt checks migration compatibility, rollback, overlapping retries and persisted results after reconnection.
func TestMySQLCaptureReceipt(t *testing.T) {
	cfg := captureTestDatabase(t)
	db := openReceiptDB(t, cfg)
	createReceiptFixture(t, db)
	repo := NewTourRepository(db)
	var version string
	if err := db.QueryRow("SELECT VERSION()").Scan(&version); err != nil {
		t.Fatal(err)
	}
	t.Logf("MySQL %s", version)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	digest := sha256.Sum256([]byte("recorded strips"))
	failure := errors.New("capture storage full")
	_, created, err := submitReceipt(ctx, repo, digest, func(int64) error { return failure })
	if created || !errors.Is(err, failure) {
		t.Fatalf("expected write rollback: %t %v", created, err)
	}
	assertReceiptState(t, db, 0, "published")
	id := concurrentReceipt(t, ctx, db, repo, digest)
	assertReceiptState(t, db, 1, "draft")
	if err := repo.MarkReady(ctx, id, "/full.jpg", "/preview.jpg", 97); err != nil {
		t.Fatal(err)
	}
	execReceiptSQL(t, db, "UPDATE properties SET status='published' WHERE id=3")
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	fresh := openReceiptDB(t, cfg)
	restarted := NewTourRepository(fresh)
	noWrite := func(int64) error { return errors.New("replay attempted storage write") }
	room, created, err := submitReceipt(ctx, restarted, digest, noWrite)
	if err != nil || created || room.ID != id || room.Status != models.TourStatusReady || room.PreviewPath != "/preview.jpg" {
		t.Fatalf("unexpected ready-room replay: room=%+v created=%t err=%v", room, created, err)
	}
	if _, _, err := submitReceipt(ctx, restarted, sha256.Sum256([]byte("different recording")), noWrite); !errors.Is(err, ErrDuplicate) {
		t.Fatal("receipt did not detect different bytes", err)
	}
	assertReceiptState(t, fresh, 1, "published")
}

// assertReceiptState verifies that the room receipt and listing draft transition were committed together.
func assertReceiptState(t *testing.T, db *sql.DB, expected int, status string) {
	t.Helper()
	var count int
	var actual string
	err := db.QueryRow("SELECT (SELECT COUNT(*) FROM property_tour_rooms WHERE capture_id IS NOT NULL),status FROM properties WHERE id=3").Scan(&count, &actual)
	if err != nil || count != expected || actual != status {
		t.Fatalf("receipt count %d, property %s, err %v", count, actual, err)
	}
}

type receiptOutcome struct {
	id      int64
	created bool
	err     error
}

// concurrentReceipt holds the winning transaction open while four independent retries wait on the same recording.
func concurrentReceipt(t *testing.T, ctx context.Context, db *sql.DB, repo TourRepository, digest [32]byte) int64 {
	t.Helper()
	entered, release := make(chan struct{}), make(chan struct{})
	unblock := sync.OnceFunc(func() { close(release) })
	defer unblock()
	var writes atomic.Int32
	// Hold the insert open until concurrent readers and submitters have entered their own connections.
	store := func(int64) error {
		if writes.Add(1) == 1 {
			close(entered)
		}
		select {
		case <-release:
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	out := make(chan receiptOutcome, 5)
	// Submit the same room as an independent request and report the durable result.
	submit := func() {
		room, created, err := submitReceipt(ctx, repo, digest, store)
		out <- receiptOutcome{room.ID, created, err}
	}
	go submit()
	select {
	case <-entered:
	case failed := <-out:
		t.Fatalf("first submission failed: %v", failed.err)
	case <-ctx.Done():
		t.Fatal(ctx.Err())
	}
	assertReceiptState(t, db, 0, "published")
	for range 4 {
		go submit()
	}
	for db.Stats().InUse < 5 {
		select {
		case early := <-out:
			t.Fatalf("uncommitted receipt escaped: %+v", early)
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		case <-time.After(5 * time.Millisecond):
		}
	}
	unblock()
	return verifySameReceipt(t, out, &writes)
}

// verifySameReceipt verifies that every request observed one room and exactly one request stored the inputs.
func verifySameReceipt(t *testing.T, out <-chan receiptOutcome, writes *atomic.Int32) int64 {
	t.Helper()
	var id int64
	createdCount := 0
	for range 5 {
		result := <-out
		if result.err != nil || result.id == 0 || (id != 0 && id != result.id) {
			t.Fatalf("inconsistent upload: %+v", result)
		}
		id = result.id
		if result.created {
			createdCount++
		}
	}
	if createdCount != 1 || writes.Load() != 1 {
		t.Fatalf("%d creates, %d storage writes", createdCount, writes.Load())
	}
	return id
}
