// Indonesian WhatsApp numbers are stored as 62 + subscriber digits; the backend accepts 8–13 subscriber digits.
const SUBSCRIBER_PATTERN = /^[1-9][0-9]{7,12}$/;
const MAX_SUBSCRIBER_DIGITS = 13;

// toSubscriberDigits cleans what a person types after a fixed "+62" prefix: formatting, a pasted +62, and the trunk 0.
export function toSubscriberDigits(input: string): string {
  const raw = input.trim();
  let digits = raw.replace(/\D/g, "");
  // Without "+", "62" is a country code only before a trunk 0 or a mobile 8; "622…" can be a local area code.
  if (raw.startsWith("+62") || /^62[08]/.test(digits)) digits = digits.slice(2);
  return digits.replace(/^0+/, "").slice(0, MAX_SUBSCRIBER_DIGITS);
}

// isValidSubscriber reports whether the digits after +62 form a plausible Indonesian number.
export function isValidSubscriber(digits: string): boolean {
  return SUBSCRIBER_PATTERN.test(digits);
}

// Sanitizes and formats a full phone number (08…, +62…, 62…) into Indonesian international format, as wa.me expects.
export function normalizeWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("620")) return "62" + digits.slice(2).replace(/^0+/, "");
  if (digits.startsWith("0")) return "62" + digits.replace(/^0+/, "");
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

// formatWhatsAppDisplay renders a full number for people to read, e.g. "+62 822-8965-9204".
export function formatWhatsAppDisplay(phone: string): string {
  const subscriber = normalizeWhatsApp(phone).slice(2);
  const groups = [subscriber.slice(0, 3), subscriber.slice(3, 7), subscriber.slice(7)].filter(Boolean);
  return groups.length ? `+62 ${groups.join("-")}` : "";
}

// buildWhatsAppChatLink builds a wa.me link to a full Indonesian number with an encoded prefilled message.
export function buildWhatsAppChatLink(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsApp(phone)}?text=${encodeURIComponent(message)}`;
}

// Builds a safe wa.me link with encoded inquiry message for the specified property.
export function buildWhatsAppLink(phone: string, propertyTitle: string): string {
  const message = `Halo, saya tertarik dengan listing properti "${propertyTitle}" di EstateVerse. Apakah masih tersedia?`;
  return buildWhatsAppChatLink(phone, message);
}

// The seeder stores this non-routable number on demo listings so their buttons never message a real person.
const DEMO_WHATSAPP_PLACEHOLDER = "628000000000";

// isDemoWhatsApp reports whether a listing carries the seeder's placeholder instead of a real seller number.
export function isDemoWhatsApp(phone: string): boolean {
  return normalizeWhatsApp(phone || "") === DEMO_WHATSAPP_PLACEHOLDER;
}
