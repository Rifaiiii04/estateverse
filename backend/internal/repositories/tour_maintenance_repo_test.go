package repositories

import (
	"strings"
	"testing"
)

// TestPrefixedRoomColumnsMatchScanner keeps the orphan-cleanup join selecting every column scanTourRoom reads.
func TestPrefixedRoomColumnsMatchScanner(t *testing.T) {
	plain := strings.Split(tourRoomColumns, ",")
	prefixed := strings.Split(prefixedRoomColumns, ",")
	if len(prefixed) != len(plain) || len(plain) != 17 {
		t.Fatalf("join selects %d columns, room scanner expects %d (want 17)", len(prefixed), len(plain))
	}
	for i, col := range prefixed {
		if want := "t." + strings.TrimSpace(plain[i]); strings.TrimSpace(col) != want {
			t.Fatalf("column %d = %q, want %q", i, strings.TrimSpace(col), want)
		}
	}
}
