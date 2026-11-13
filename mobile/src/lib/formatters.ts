// Formatting helpers for prices, areas, slugs, and phone numbers.

// Formats a number as full Indonesian Rupiah (e.g. Rp 2.200.000.000).
export function formatIDR(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

// Formats a number as a short Rupiah label (e.g. Rp 2,2 M or Rp 450 Jt).
export function formatCompactIDR(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${trimDecimal(value / 1_000_000_000)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${trimDecimal(value / 1_000_000)} Jt`;
  }
  return formatIDR(value);
}

// Rounds to one decimal place and uses a decimal comma like Indonesian writing.
function trimDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace('.', ',');
}

// Formats a raw digit string with thousand separators for price inputs.
export function formatRupiahInput(raw: string): string {
  if (!raw) return '';
  return Number(raw).toLocaleString('id-ID');
}

// Keeps only digits from a text input value.
export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

// Formats an area value in square meters.
export function formatArea(value: number): string {
  return `${value.toLocaleString('id-ID')} m²`;
}

// Builds a URL-friendly slug from a title.
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Converts a local phone number (08xx) to the international WhatsApp format (628xx).
export function normalizeWhatsAppNumber(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
}

// Builds a wa.me link with a prefilled message.
export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}

// Formats an ISO date string into a short Indonesian date.
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
