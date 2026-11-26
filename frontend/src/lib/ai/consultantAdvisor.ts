import { formatIDR } from "@/lib/utils/formatters";
import { assessAffordability, minimumIncomeFor, monthlyInstallment, parseRupiahAmounts } from "@/lib/utils/mortgage";

export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  recommendationLink?: string;
  recommendationTitle?: string;
  offline?: boolean;
}

interface OfflineAnswer {
  text: string;
  link?: string;
  title?: string;
}

const DEFAULT_DP = 10;
const DEFAULT_RATE = 7;
const DEFAULT_YEARS = 15;
const DEFAULT_PRICE = 350_000_000;
const MIN_PRICE_AMOUNT = 50_000_000; // smaller amounts are treated as monthly income, matching the online assistant

const DP_PATTERN = /dp\s*(\d{1,2}(?:[.,]\d+)?)\s*%/i;
const RATE_PATTERN = /bunga\s*(\d{1,2}(?:[.,]\d+)?)\s*%/i;
const TENOR_PATTERN = /(\d{1,2})\s*(?:tahun|thn)/i;

/** Loan terms read from the question; assumed lists the defaults used for values the user did not state. */
interface LoanTerms {
  dp: number;
  rate: number;
  years: number;
  assumed: string[];
}

// matches reports whether the lowercase query contains any of the keywords.
function matches(q: string, keywords: string[]): boolean {
  return keywords.some((k) => q.includes(k));
}

// percentIn reads the first percentage a pattern captures, or null when absent or out of range.
function percentIn(pattern: RegExp, text: string, max: number): number | null {
  const m = text.match(pattern);
  if (!m) return null;
  const value = Number(m[1].replace(",", "."));
  return value >= 0 && value <= max ? value : null;
}

// loanTermsFrom takes the DP, interest, and tenor the user wrote, falling back to stated defaults.
function loanTermsFrom(query: string): LoanTerms {
  const dp = percentIn(DP_PATTERN, query, 90);
  const rate = percentIn(RATE_PATTERN, query, 30);
  const tenorMatch = query.match(TENOR_PATTERN);
  const tenor = tenorMatch ? Number(tenorMatch[1]) : null;
  const years = tenor !== null && tenor >= 1 && tenor <= 30 ? tenor : null;
  const assumed = [
    dp === null && `DP ${DEFAULT_DP}%`,
    rate === null && `bunga ${DEFAULT_RATE}%/tahun`,
    years === null && `tenor ${DEFAULT_YEARS} tahun`,
  ].filter((x): x is string => Boolean(x));
  return { dp: dp ?? DEFAULT_DP, rate: rate ?? DEFAULT_RATE, years: years ?? DEFAULT_YEARS, assumed };
}

// splitPriceAndIncome treats the largest big amount as the house price and the largest small one as monthly income.
function splitPriceAndIncome(amounts: number[]): { price: number; income: number } {
  const prices = amounts.filter((a) => a >= MIN_PRICE_AMOUNT);
  const incomes = amounts.filter((a) => a < MIN_PRICE_AMOUNT);
  return { price: prices.length ? Math.max(...prices) : 0, income: incomes.length ? Math.max(...incomes) : 0 };
}

// affordabilityAnswer estimates the installment with the user's own DP, rate, and tenor and checks it against income.
function affordabilityAnswer(query: string): OfflineAnswer {
  const { price: statedPrice, income } = splitPriceAndIncome(parseRupiahAmounts(query));
  const price = statedPrice || DEFAULT_PRICE;
  const terms = loanTermsFrom(query);
  const installment = monthlyInstallment({ price, downPaymentPct: terms.dp, annualRatePct: terms.rate, years: terms.years });
  const lines = [
    `Estimasi untuk rumah ${formatIDR(price)} (DP ${terms.dp}%, bunga ${terms.rate}%/tahun, tenor ${terms.years} tahun): cicilan sekitar ${formatIDR(installment)} per bulan.`,
    `Patokan perencanaan keuangan: cicilan ≤30% gaji terasa nyaman, jadi penghasilan sekitar ${formatIDR(minimumIncomeFor(installment))} per bulan. Batas tiap bank berbeda, umumnya sekitar 35–40%.`,
  ];
  if (income > 0) {
    const { ratio, level } = assessAffordability(installment, income);
    const label = { nyaman: "nyaman", "batas-bank": "mendekati batas bank", berisiko: "berisiko ditolak bank" }[level];
    lines.push(`Dengan gaji ${formatIDR(income)}, cicilan ini ${Math.round(ratio * 100)}% dari gaji — ${label}. Hitung juga sisa uang setelah cicilan dan pengeluaran rutin.`);
  }
  const assumedPrice = statedPrice ? [] : [`harga ${formatIDR(DEFAULT_PRICE)}`];
  const assumptions = [...assumedPrice, ...terms.assumed];
  if (assumptions.length > 0) {
    lines.push(`Asumsi karena tidak disebutkan: ${assumptions.join(", ")}. Tulis angkanya (contoh: "DP 20%, tenor 20 tahun, bunga 6,5%") agar hitungan sesuai rencana Anda.`);
  }
  lines.push("Angka ini perkiraan. Bunga dan syarat sebenarnya tergantung bank — konfirmasi saat mengajukan KPR.");
  return { text: lines.join("\n"), link: "/properties?priceRange=300m_to_700m", title: "Lihat rumah sesuai anggaran" };
}

// generateAiAnswer is the offline fallback used when the online assistant is unavailable.
export function generateAiAnswer(query: string): OfflineAnswer {
  const q = query.toLowerCase();
  if (matches(q, ["cicil", "kpr", "gaji", "mampu", "dp ", "angsuran", "salary", "afford", "installment", "mortgage", "down payment"])) return affordabilityAnswer(q);
  if (matches(q, ["dokumen", "syarat", "berkas", "persyaratan", "document", "requirement"])) {
    return {
      text: "Dokumen umum pengajuan KPR: KTP suami/istri, Kartu Keluarga, buku nikah (jika menikah), NPWP, slip gaji 3 bulan terakhir, surat keterangan kerja, dan rekening koran 3–6 bulan. Wiraswasta biasanya diminta laporan keuangan atau SIUP/NIB. Dari penjual: fotokopi sertifikat (SHM/HGB), PBB terakhir, dan IMB/PBG. Syarat pasti tiap bank bisa berbeda.",
    };
  }
  if (matches(q, ["biaya", "pajak", "notaris", "bphtb", "ajb", "cost", "tax", "notary", "fee"])) {
    return {
      text: "Selain DP, siapkan biaya tambahan. Pembeli: BPHTB 5% × (harga − NPOPTKP daerah), biaya AJB/PPAT (maksimal 1% dari harga), balik nama, serta biaya KPR (provisi, appraisal, asuransi). Penjual: PPh final 2,5% dari harga. Sebagai patokan kasar, sisihkan sekitar 5–10% dari harga rumah dan minta rincian pasti ke notaris/PPAT.",
    };
  }
  if (matches(q, ["360", "tur", "rekam", "kamera", "foto ruangan"])) {
    return {
      text: "Nyalakan lampu dan pegang HP tegak setinggi mata. Putar perlahan ke kanan dengan lensa tetap di satu posisi. Kamera mengambil gambar otomatis selama sapuan. Ikuti panduan untuk merekam bagian atas dan bawah sampai seluruh ruangan tercakup.",
    };
  }
  if (matches(q, ["jual", "iklan", "penjual", "pasang", "sell", "listing"])) {
    return {
      text: "Untuk menjual sendiri: daftar sebagai penjual, isi data rumah dengan jujur (harga, luas, kondisi), unggah foto yang terang, lalu buka halaman edit dari HP untuk merekam tur 360° tiap ruangan. Pembeli bisa langsung menghubungi Anda lewat WhatsApp tanpa perantara.",
      link: "/register",
      title: "Daftar sebagai penjual",
    };
  }
  return {
    text: "Saya bisa membantu: (1) menghitung perkiraan cicilan dan kemampuan bayar — contoh: \"rumah 350 juta, gaji 6 juta\", (2) daftar dokumen KPR, (3) rincian biaya tambahan saat membeli, dan (4) tips merekam tur 360° untuk penjual.",
    link: "/properties",
    title: "Lihat daftar rumah",
  };
}
