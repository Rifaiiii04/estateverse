package services

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

// Defaults used when the question does not state its own down payment, rate, or tenor.
const (
	defaultDownPaymentPct = 10.0
	defaultAnnualRatePct  = 7.0
	minPriceAmount        = 50_000_000 // smaller amounts are treated as income, not house price
)

var (
	amountPattern  = regexp.MustCompile(`(?i)(\d+(?:[.,]\d+)*)\s*(miliar|milyar|juta|jt|ribu|rb)?`)
	dpPattern      = regexp.MustCompile(`(?i)dp\s*(\d{1,2}(?:[.,]\d+)?)\s*%`)
	ratePattern    = regexp.MustCompile(`(?i)bunga\s*(\d{1,2}(?:[.,]\d+)?)\s*%`)
	tenorPattern   = regexp.MustCompile(`(?i)(\d{1,2})\s*(?:tahun|thn)`)
	defaultTenures = []int{15, 20}
	unitMultiplier = map[string]float64{"miliar": 1e9, "milyar": 1e9, "juta": 1e6, "jt": 1e6, "ribu": 1e3, "rb": 1e3}
)

// parseRupiahAmounts extracts money amounts such as "350 juta", "1,2 miliar", or "Rp 450.000.000".
func parseRupiahAmounts(text string) []int64 {
	var out []int64
	for _, m := range amountPattern.FindAllStringSubmatch(text, -1) {
		value, ok := amountValue(m[1], strings.ToLower(m[2]))
		if ok && value >= 1_000_000 {
			out = append(out, int64(math.Round(value)))
		}
	}
	return out
}

// amountValue converts the numeric text and optional unit word into Rupiah.
func amountValue(number, unit string) (float64, bool) {
	if mult, ok := unitMultiplier[unit]; ok {
		n, err := strconv.ParseFloat(strings.ReplaceAll(strings.ReplaceAll(number, ".", ""), ",", "."), 64)
		return n * mult, err == nil
	}
	n, err := strconv.ParseFloat(strings.NewReplacer(".", "", ",", "").Replace(number), 64)
	return n, err == nil
}

// annuityInstallment computes the fixed monthly KPR installment.
func annuityInstallment(price int64, downPaymentPct, annualRatePct float64, years int) int64 {
	principal := float64(price) * (1 - downPaymentPct/100)
	months := float64(years * 12)
	if principal <= 0 || months <= 0 {
		return 0
	}
	r := annualRatePct / 100 / 12
	if r == 0 {
		return int64(math.Round(principal / months))
	}
	f := math.Pow(1+r, months)
	return int64(math.Round(principal * r * f / (f - 1)))
}

// percentFrom reads the first percentage captured by a pattern, falling back to a default.
func percentFrom(pattern *regexp.Regexp, text string, fallback float64) float64 {
	m := pattern.FindStringSubmatch(text)
	if m == nil {
		return fallback
	}
	v, err := strconv.ParseFloat(strings.ReplaceAll(m[1], ",", "."), 64)
	if err != nil || v < 0 || v > 90 {
		return fallback
	}
	return v
}

// tenuresFrom returns the tenor stated in the question, or the default 15 and 20 years.
func tenuresFrom(text string) []int {
	m := tenorPattern.FindStringSubmatch(text)
	if m == nil {
		return defaultTenures
	}
	years, err := strconv.Atoi(m[1])
	if err != nil || years < 1 || years > 30 {
		return defaultTenures
	}
	return []int{years}
}

// splitPriceAndIncome treats the largest big amount as the house price and the largest small one as monthly income.
func splitPriceAndIncome(amounts []int64) (price, income int64) {
	for _, a := range amounts {
		if a >= minPriceAmount && a > price {
			price = a
		}
		if a < minPriceAmount && a > income {
			income = a
		}
	}
	return price, income
}

// buildCalculationHint computes installments (and DSR when income is given) for the user's question,
// so the language model explains system-computed numbers instead of calculating them itself.
func buildCalculationHint(question string) string {
	price, income := splitPriceAndIncome(parseRupiahAmounts(question))
	if price == 0 {
		return ""
	}
	dp := percentFrom(dpPattern, question, defaultDownPaymentPct)
	rate := percentFrom(ratePattern, question, defaultAnnualRatePct)
	down := int64(math.Round(float64(price) * dp / 100))

	var b strings.Builder
	b.WriteString("\n\nHASIL HITUNG SISTEM (wajib dipakai apa adanya, jangan menghitung ulang):\n")
	fmt.Fprintf(&b, "- Harga rumah %s; DP %.0f%% = %s; pokok pinjaman %s; asumsi bunga %.1f%%/tahun (anuitas)\n",
		formatRupiah(price), dp, formatRupiah(down), formatRupiah(price-down), rate)
	for _, years := range tenuresFrom(question) {
		installment := annuityInstallment(price, dp, rate, years)
		fmt.Fprintf(&b, "- Tenor %d tahun: cicilan %s per bulan", years, formatRupiah(installment))
		if income > 0 {
			fmt.Fprintf(&b, "; dengan gaji %s, DSR %.0f%%", formatRupiah(income), float64(installment)/float64(income)*100)
		}
		b.WriteString("\n")
	}
	return b.String()
}
