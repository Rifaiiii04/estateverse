package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// TestClientIPIgnoresForwardedHeaderWithoutProxy ensures spoofed X-Forwarded-For cannot bypass limits when not proxied.
func TestClientIPIgnoresForwardedHeaderWithoutProxy(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.RemoteAddr = "203.0.113.7:51234"
	r.Header.Set("X-Forwarded-For", "1.2.3.4")

	if got := ClientIP(r, false); got != "203.0.113.7" {
		t.Fatalf("expected remote address IP, got %q", got)
	}
}

// TestClientIPUsesProxyAppendedEntry ensures only the last (proxy-written) X-Forwarded-For entry is trusted.
func TestClientIPUsesProxyAppendedEntry(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.RemoteAddr = "172.18.0.5:443"
	r.Header.Set("X-Forwarded-For", "1.2.3.4, 198.51.100.9")

	if got := ClientIP(r, true); got != "198.51.100.9" {
		t.Fatalf("expected proxy-appended IP, got %q", got)
	}
}

// TestRateLimiterBlocksAfterLimit verifies requests beyond the quota receive HTTP 429.
func TestRateLimiterBlocksAfterLimit(t *testing.T) {
	rl := NewRateLimiter(2, time.Minute, false)
	handler := rl.Limit(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	codes := make([]int, 0, 3)
	for i := 0; i < 3; i++ {
		r := httptest.NewRequest(http.MethodPost, "/", nil)
		r.RemoteAddr = "203.0.113.7:1000"
		r.Header.Set("X-Forwarded-For", "10.0.0."+string(rune('1'+i)))
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		codes = append(codes, w.Code)
	}

	if codes[2] != http.StatusTooManyRequests {
		t.Fatalf("expected third request to be limited despite spoofed headers, got %v", codes)
	}
}
