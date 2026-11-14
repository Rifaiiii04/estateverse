package services

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"projectfai/backend/internal/models"
)

const (
	maxHistoryMessages        = 10
	maxMessageRunes           = 1000
	maxContextListings        = 20
	maxPromptDescriptionRunes = 600
)

// assistantRules is the system prompt defining the assistant's role and safety rules (Indonesian audience).
const assistantRules = `Kamu adalah "Asisten Pintar EstateVerse", pendamping untuk pembeli rumah pertama dan penjual rumah perorangan di Indonesia.
EstateVerse membantu penjual perorangan dan developer kecil memasarkan rumah sendiri dengan tur virtual 360° yang direkam dari HP, tanpa perantara mahal.

Aturan menjawab:
1. Gunakan bahasa yang dipakai pengguna (utamanya Bahasa Indonesia sehari-hari yang sopan), singkat, jelas, dan tanpa istilah sulit. Maksimal sekitar 180 kata.
2. Jangan menghitung cicilan atau DSR sendiri. Jika ada bagian "HASIL HITUNG SISTEM", pakai angka itu persis beserta asumsinya. Jika tidak ada, jangan menyebut angka cicilan spesifik; arahkan pengguna ke kalkulator di halaman rumah atau minta harga rumah dan gajinya. Semua angka adalah ESTIMASI, sarankan konfirmasi ke bank atau notaris.
3. Rasio cicilan terhadap gaji (DSR): ≤30% adalah patokan nyaman dari perencana keuangan, bukan aturan OJK untuk KPR; batas tiap bank berbeda, umumnya sekitar 35–40%. Ingatkan juga menghitung sisa uang setelah cicilan dan pengeluaran rutin.
4. Jangan pernah menjanjikan keuntungan investasi, kenaikan harga, atau hasil sewa.
5. Hanya rekomendasikan properti dari DAFTAR LISTING di bawah. Jangan mengarang listing, harga, atau fasilitas. Sertakan tautannya dalam format /properties/slug.
6. Untuk penjual: bantu menulis deskripsi iklan yang jujur, beri tips merekam tur 360° (berdiri di tengah ruangan, lampu menyala, HP tegak setinggi mata, putar HP di titik yang sama dengan lensa sebagai poros, jangan mengayunkan HP melingkar), dan daftar dokumen (SHM/HGB, PBB, IMB/PBG, KTP).
7. Jangan meminta data pribadi sensitif seperti NIK, nomor rekening, atau password.
8. Jika pertanyaan di luar topik rumah dan properti, arahkan kembali dengan sopan.`

// buildSystemPrompt combines the rules with live listing data and, optionally, the property being viewed.
func buildSystemPrompt(listings []models.Property, current *models.Property) string {
	var b strings.Builder
	b.WriteString(assistantRules)
	b.WriteString("\n\nDAFTAR LISTING (data asli dari database EstateVerse):\n")
	if len(listings) == 0 {
		b.WriteString("- Belum ada listing yang dipublikasikan.\n")
	}
	for _, p := range listings {
		b.WriteString(listingLine(p))
	}
	if current != nil {
		b.WriteString("\nPENGGUNA SEDANG MELIHAT PROPERTI INI:\n")
		b.WriteString(listingLine(*current))
		b.WriteString("Deskripsi: " + truncateRunes(current.Description, maxPromptDescriptionRunes) + "\n")
		if len(current.Benefits) > 0 {
			b.WriteString("Keunggulan: " + strings.Join(current.Benefits, "; ") + "\n")
		}
	}
	return b.String()
}

// listingLine renders one listing as a compact line for the model's context.
func listingLine(p models.Property) string {
	return fmt.Sprintf("- %s | %s, %s | %s | %d KT, %d KM | LT %d m², LB %d m² | /properties/%s\n",
		p.Title, p.City, p.Province, formatRupiah(p.Price), p.Bedrooms, p.Bathrooms, p.LandArea, p.BuildingArea, p.Slug)
}

// formatRupiah formats an integer price with Indonesian thousand separators.
func formatRupiah(v int64) string {
	digits := fmt.Sprintf("%d", v)
	var out []byte
	for i := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			out = append(out, '.')
		}
		out = append(out, digits[i])
	}
	return "Rp " + string(out)
}

// sanitizeHistory keeps the latest user/assistant turns, trims long messages, and requires a final user turn.
func sanitizeHistory(history []ChatMessage) ([]ChatMessage, error) {
	clean := make([]ChatMessage, 0, len(history))
	for _, m := range history {
		content := strings.TrimSpace(m.Content)
		if content == "" || (m.Role != "user" && m.Role != "assistant") {
			continue
		}
		clean = append(clean, ChatMessage{Role: m.Role, Content: truncateRunes(content, maxMessageRunes)})
	}
	if len(clean) > maxHistoryMessages {
		clean = clean[len(clean)-maxHistoryMessages:]
	}
	if len(clean) == 0 || clean[len(clean)-1].Role != "user" {
		return nil, newValidationError("pesan terakhir harus berasal dari pengguna")
	}
	return clean, nil
}

// truncateRunes shortens text to at most n characters without splitting multi-byte runes.
func truncateRunes(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	return string([]rune(s)[:n]) + "…"
}
