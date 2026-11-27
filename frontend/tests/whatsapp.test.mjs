import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildWhatsAppChatLink,
  formatWhatsAppDisplay,
  isValidSubscriber,
  normalizeWhatsApp,
  toSubscriberDigits,
} from "../src/lib/utils/whatsapp.ts";

test("the +62 field drops a typed or pasted trunk 0 and country code", () => {
  assert.equal(toSubscriberDigits("0822-8965-9204"), "82289659204");
  assert.equal(toSubscriberDigits("+62 822 8965 9204"), "82289659204");
  assert.equal(toSubscriberDigits("+62 0822 8965 9204"), "82289659204");
  assert.equal(toSubscriberDigits("6282289659204"), "82289659204");
  assert.equal(toSubscriberDigits("82289659204"), "82289659204");
});

test("a local area code starting with 62 is kept when no + is typed", () => {
  assert.equal(toSubscriberDigits("622 1234567"), "6221234567");
});

test("the +62 field caps input at 13 subscriber digits", () => {
  assert.equal(toSubscriberDigits("8".repeat(20)).length, 13);
});

test("subscriber validation matches the backend rule", () => {
  assert.ok(isValidSubscriber("82289659204"));
  assert.ok(!isValidSubscriber("812"));
  assert.ok(!isValidSubscriber(""));
});

test("stored lead numbers in any old format open the right WhatsApp chat", () => {
  assert.equal(normalizeWhatsApp("0822-8965-9204"), "6282289659204");
  assert.equal(normalizeWhatsApp("+62 0822 8965 9204"), "6282289659204");
  assert.equal(normalizeWhatsApp("6282289659204"), "6282289659204");
  assert.ok(buildWhatsAppChatLink("0822-8965-9204", "Halo").startsWith("https://wa.me/6282289659204?text="));
});

test("a seller number already stored with country code is not changed", () => {
  assert.equal(normalizeWhatsApp("622112345678"), "622112345678");
});

test("numbers are shown to sellers with +62 and dashes", () => {
  assert.equal(formatWhatsAppDisplay("6282289659204"), "+62 822-8965-9204");
  assert.equal(formatWhatsAppDisplay("0822-8965-9204"), "+62 822-8965-9204");
});
