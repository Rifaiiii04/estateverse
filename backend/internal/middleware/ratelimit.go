package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type clientRecord struct {
	count     int
	lastReset time.Time
}

// RateLimiter holds thread-safe IP access frequency tracking.
type RateLimiter struct {
	mu      sync.Mutex
	clients map[string]*clientRecord
	limit   int
	window  time.Duration
}

// NewRateLimiter instantiates an in-memory IP rate limiter.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		clients: make(map[string]*clientRecord),
		limit:   limit,
		window:  window,
	}
	go rl.cleanupLoop()
	return rl
}

// Limit returns an HTTP middleware enforcing request quotas per client IP.
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)

		rl.mu.Lock()
		record, exists := rl.clients[ip]
		now := time.Now()

		if !exists || now.Sub(record.lastReset) > rl.window {
			rl.clients[ip] = &clientRecord{count: 1, lastReset: now}
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		if record.count >= rl.limit {
			rl.mu.Unlock()
			http.Error(w, `{"error":"too many requests, please slow down"}`, http.StatusTooManyRequests)
			return
		}

		record.count++
		rl.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}

// cleanupLoop periodically sweeps stale client tracking records.
func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, rec := range rl.clients {
			if now.Sub(rec.lastReset) > rl.window*2 {
				delete(rl.clients, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// getClientIP extracts real client IP address from request headers or remote address.
func getClientIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}
