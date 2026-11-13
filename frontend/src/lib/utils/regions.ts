// Interface representing an administrative province.
export interface Province {
  id: string;
  name: string;
}

// Interface representing an administrative regency or city.
export interface Regency {
  id: string;
  province_id: string;
  name: string;
}

const FALLBACK_PROVINCES: Province[] = [
  { id: "31", name: "DKI JAKARTA" },
  { id: "32", name: "JAWA BARAT" },
  { id: "33", name: "JAWA TENGAH" },
  { id: "34", name: "DI YOGYAKARTA" },
  { id: "35", name: "JAWA TIMUR" },
  { id: "36", name: "BANTEN" },
  { id: "51", name: "BALI" },
  { id: "12", name: "SUMATERA UTARA" },
  { id: "13", name: "SUMATERA BARAT" },
  { id: "14", name: "RIAU" },
  { id: "16", name: "SUMATERA SELATAN" },
  { id: "64", name: "KALIMANTAN TIMUR" },
  { id: "73", name: "SULAWESI SELATAN" },
];

const FALLBACK_CITIES: Record<string, string[]> = {
  "31": ["JAKARTA SELATAN", "JAKARTA PUSAT", "JAKARTA BARAT", "JAKARTA UTARA", "JAKARTA TIMUR"],
  "32": ["KOTA BANDUNG", "KABUPATEN BANDUNG", "KOTA BEKASI", "KOTA BOGOR", "KOTA DEPOK", "KABUPATEN BOGOR", "KOTA CIMAHI"],
  "33": ["KOTA SEMARANG", "KOTA SURAKARTA", "KOTA MAGELANG", "KABUPATEN BANYUMAS", "KABUPATEN KUDUS"],
  "34": ["KOTA YOGYAKARTA", "KABUPATEN SLEMAN", "KABUPATEN BANTUL", "KABUPATEN GUNUNGKIDUL"],
  "35": ["KOTA SURABAYA", "KOTA MALANG", "KABUPATEN SIDOARJO", "KOTA BATU", "KABUPATEN GRESIK"],
  "36": ["KOTA TANGERANG", "KOTA TANGERANG SELATAN", "KABUPATEN TANGERANG", "KOTA SERANG"],
  "51": ["KOTA DENPASAR", "KABUPATEN BADUNG", "KABUPATEN GIANYAR", "KABUPATEN TABANAN"],
  "12": ["KOTA MEDAN", "KOTA BINJAI", "KABUPATEN DELI SERDANG"],
  "13": ["KOTA PADANG", "KOTA BUKITTINGGI", "KOTA PARIAMAN"],
  "14": ["KOTA PEKANBARU", "KOTA DUMAI"],
  "16": ["KOTA PALEMBANG", "KOTA PRABUMULIH"],
  "64": ["KOTA BALIKPAPAN", "KOTA SAMARINDA", "KOTA BONTANG", "KABUPATEN PENAJAM PASER UTARA"],
  "73": ["KOTA MAKASSAR", "KABUPATEN GOWA", "KOTA PAREPARE"],
};

// Fetches Indonesian provinces with online priority and instant offline fallback.
export async function getProvinces(): Promise<Province[]> {
  try {
    const res = await fetch("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json", {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {
    // Falls back seamlessly to bundled offline directory
  }
  return FALLBACK_PROVINCES;
}

// Fetches cities for a given province ID or name with offline fallback.
export async function getCities(provinceId: string, provinceName?: string): Promise<string[]> {
  try {
    if (provinceId) {
      const res = await fetch(
        `https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: Regency) => item.name);
        }
      }
    }
  } catch {
    // Falls back to offline list
  }

  if (provinceId && FALLBACK_CITIES[provinceId]) {
    return FALLBACK_CITIES[provinceId];
  }

  if (provinceName) {
    const matched = FALLBACK_PROVINCES.find(
      (p) => p.name.toLowerCase() === provinceName.toLowerCase()
    );
    if (matched && FALLBACK_CITIES[matched.id]) {
      return FALLBACK_CITIES[matched.id];
    }
  }

  return ["KOTA BANDUNG", "KOTA JAKARTA SELATAN", "KOTA SURABAYA", "KOTA SEMARANG", "KOTA DENPASAR"];
}
