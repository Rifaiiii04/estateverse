// Formats numeric currency values into standardized Indonesian Rupiah string (e.g. Rp1.250.000.000).
export function formatIDR(amount: number): string {
  if (isNaN(amount) || amount <= 0) {
    return "Rp0";
  }
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `Rp${formatted}`;
}

// Formats large Rupiah values into compact architectural price tags (e.g. Rp 4,7 M or Rp 850 Jt).
export function formatCompactIDR(amount: number, isEn = false): string {
  if (isNaN(amount) || amount <= 0) {
    return "Rp 0";
  }
  if (amount >= 1_000_000_000) {
    const val = (amount / 1_000_000_000).toFixed(amount % 1_000_000_000 === 0 ? 0 : 1);
    return isEn ? `Rp ${val}B` : `Rp ${val.replace(".", ",")} M`;
  }
  if (amount >= 1_000_000) {
    const val = Math.round(amount / 1_000_000);
    return isEn ? `Rp ${val}M` : `Rp ${val} Jt`;
  }
  return formatIDR(amount);
}

// Formats land and building surface area in square meters.
export function formatArea(squareMeters: number): string {
  if (isNaN(squareMeters) || squareMeters <= 0) {
    return "0 m²";
  }
  return `${squareMeters.toLocaleString("id-ID")} m²`;
}

// Formats ISO timestamp string into human readable Indonesian date format.
export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

// Formats user typing into dynamic Rupiah representation (e.g. Rp 20.000.000).
export function formatRupiahInput(value: string | number): string {
  const digits = String(value).replace(/[^0-9]/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return `Rp ${num.toLocaleString("id-ID")}`;
}

// Parses raw Rupiah string back into positive integer value.
export function parseRupiahInput(value: string): number {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}
