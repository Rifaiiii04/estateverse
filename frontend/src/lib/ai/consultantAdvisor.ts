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

// matches reports whether the lowercase query contains any of the keywords.
function matches(q: string, keywords: string[]): boolean {
  return keywords.some((k) => q.includes(k));
}

// affordabilityAnswer estimates the installment for a price found in the question and checks it against income.
function affordabilityAnswer(query: string): OfflineAnswer {
  const amounts = parseRupiahAmounts(query).sort((a, b) => b - a);
  const price = amounts[0] ?? 350_000_000;
  const income = amounts.length > 1 ? amounts[amounts.length - 1] : 0;
  const installment = monthlyInstallment({ price, downPaymentPct: DEFAULT_DP, annualRatePct: DEFAULT_RATE, years: DEFAULT_YEARS });
  const lines = [
    `Estimasi untuk rumah ${formatIDR(price)} (DP ${DEFAULT_DP}%, bunga ${DEFAULT_RATE}%/tahun, tenor ${DEFAULT_YEARS} tahun): cicilan sekitar ${formatIDR(installment)} per bulan.`,
    `Patokan perencanaan keuangan: cicilan ≤30% gaji terasa nyaman, jadi penghasilan sekitar ${formatIDR(minimumIncomeFor(installment))} per bulan. Batas tiap bank berbeda, umumnya sekitar 35–40%.`,
  ];
  if (income > 0) {
    const { ratio, level } = assessAffordability(installment, income);
    const label = { nyaman: "nyaman", "batas-bank": "mendekati batas bank", berisiko: "berisiko ditolak bank" }[level];
    lines.push(`Dengan gaji ${formatIDR(income)}, cicilan ini ${Math.round(ratio * 100)}% dari gaji — ${label}. Hitung juga sisa uang setelah cicilan dan pengeluaran rutin.`);
  }
  lines.push("Angka ini perkiraan. Bunga dan syarat sebenarnya tergantung bank — konfirmasi saat mengajukan KPR.");
  return { text: lines.join("\n"), link: "/properties?priceRange=300m_to_700m", title: "Lihat rumah sesuai anggaran" };
}

// generateAiAnswer is the offline fallback used when the online assistant is unavailable.
export function generateAiAnswer(query: string): OfflineAnswer {
  const q = query.toLowerCase();
  if (matches(q, ["cicil", "kpr", "gaji", "mampu", "dp ", "angsuran"])) return affordabilityAnswer(q);
  if (matches(q, ["dokumen", "syarat", "berkas", "persyaratan"])) {
    return {
      text: "Dokumen umum pengajuan KPR: KTP suami/istri, Kartu Keluarga, buku nikah (jika menikah), NPWP, slip gaji 3 bulan terakhir, surat keterangan kerja, dan rekening koran 3–6 bulan. Wiraswasta biasanya diminta laporan keuangan atau SIUP/NIB. Dari penjual: fotokopi sertifikat (SHM/HGB), PBB terakhir, dan IMB/PBG. Syarat pasti tiap bank bisa berbeda.",
    };
  }
  if (matches(q, ["biaya", "pajak", "notaris", "bphtb", "ajb"])) {
    return {
      text: "Selain DP, siapkan biaya tambahan. Pembeli: BPHTB 5% × (harga − NPOPTKP daerah), biaya AJB/PPAT (maksimal 1% dari harga), balik nama, serta biaya KPR (provisi, appraisal, asuransi). Penjual: PPh final 2,5% dari harga. Sebagai patokan kasar, sisihkan sekitar 5–10% dari harga rumah dan minta rincian pasti ke notaris/PPAT.",
    };
  }
  if (matches(q, ["360", "tur", "rekam", "kamera", "foto ruangan"])) {
    return {
      text: "Tips merekam tur 360° dari HP: nyalakan semua lampu, berdiri di tengah ruangan, pegang HP tegak setinggi mata, lalu putar HP di titik yang sama (lensa sebagai poros) sambil mengarahkan lingkaran ke titik putih. Foto diambil otomatis — rekam putaran tengah, atas, bawah, lalu plafon dan lantai. Jangan berjalan saat merekam supaya sambungan panorama rapi.",
    };
  }
  if (matches(q, ["jual", "iklan", "penjual", "pasang"])) {
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
