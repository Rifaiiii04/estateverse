package services

import (
	"context"
	"encoding/json"
	"net/http"
	"reflect"
	"strings"
	"testing"
)

// TestParseRupiahAmounts covers unit words, thousand separators, and ignoring small numbers.
func TestParseRupiahAmounts(t *testing.T) {
	got := parseRupiahAmounts("rumah 350 juta, gaji 6 juta, harga lain Rp 1.250.000.000 atau 1,2 miliar, LT 100 m2")
	want := []int64{350_000_000, 6_000_000, 1_250_000_000, 1_200_000_000}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v want %v", got, want)
	}
}

// TestAnnuityInstallment checks the formula against independently computed reference values.
func TestAnnuityInstallment(t *testing.T) {
	cases := []struct {
		years int
		want  int64
	}{{15, 2_831_309}, {20, 2_442_192}}
	for _, c := range cases {
		if got := annuityInstallment(350_000_000, 10, 7, c.years); got < c.want-1 || got > c.want+1 {
			t.Fatalf("%d years: got %d want ~%d", c.years, got, c.want)
		}
	}
}

// TestBuildCalculationHint verifies the prompt carries system-computed installments, DSR, and stated parameters.
func TestBuildCalculationHint(t *testing.T) {
	hint := buildCalculationHint("Rumah 350 juta, gaji saya 6 juta — cicilannya aman?")
	for _, want := range []string{"HASIL HITUNG SISTEM", "Rp 350.000.000", "Rp 2.831.309", "Rp 2.442.192", "DSR 47%"} {
		if !strings.Contains(hint, want) {
			t.Fatalf("hint missing %q:\n%s", want, hint)
		}
	}
	custom := buildCalculationHint("rumah 500 juta dp 20% bunga 6% 10 tahun")
	if !strings.Contains(custom, "DP 20%") || !strings.Contains(custom, "Tenor 10 tahun") || strings.Contains(custom, "Tenor 15") {
		t.Fatalf("custom parameters not honoured:\n%s", custom)
	}
	if buildCalculationHint("Dokumen apa saja untuk KPR?") != "" {
		t.Fatal("questions without a house price must not produce a calculation")
	}
}

// TestReplySendsSystemCalculation ensures the prompt sent to the model contains the system-computed installment.
func TestReplySendsSystemCalculation(t *testing.T) {
	var system string
	a := newAssistantFixture(t, func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Messages []ChatMessage `json:"messages"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		system = body.Messages[0].Content
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"ok"}}]}`))
	})
	question := []ChatMessage{{Role: "user", Content: "rumah 350 juta gaji 6 juta"}}
	if _, err := a.Reply(context.Background(), question, ""); err != nil {
		t.Fatalf("reply failed: %v", err)
	}
	if !strings.Contains(system, "HASIL HITUNG SISTEM") || !strings.Contains(system, "Rp 2.831.309") {
		t.Fatalf("system prompt lacks system calculation:\n%s", system)
	}
}
