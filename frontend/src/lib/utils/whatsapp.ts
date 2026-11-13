// Sanitizes and formats phone numbers into Indonesian international format.
export function normalizeWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return "62" + digits.substring(1);
  }
  if (digits.startsWith("62")) {
    return digits;
  }
  return "62" + digits;
}

// Builds a safe wa.me link with encoded inquiry message for the specified property.
export function buildWhatsAppLink(phone: string, propertyTitle: string): string {
  const normalized = normalizeWhatsApp(phone);
  const message = `Halo, saya tertarik dengan listing properti "${propertyTitle}" di EstateVerse. Apakah masih tersedia?`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
