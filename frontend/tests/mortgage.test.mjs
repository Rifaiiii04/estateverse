import assert from "node:assert/strict";
import { test } from "node:test";
import { monthlyInstallment, parseAnnualRate } from "../src/lib/utils/mortgage.ts";

test("invalid interest input is rejected instead of silently becoming 0%", () => {
  for (const raw of ["abc", "-5", "0", "", "31", "7%", "1e2"]) {
    assert.equal(parseAnnualRate(raw), null, raw);
  }
});

test("valid interest input accepts Indonesian decimal commas", () => {
  assert.equal(parseAnnualRate("7"), 7);
  assert.equal(parseAnnualRate(" 6,5 "), 6.5);
  assert.equal(parseAnnualRate("30"), 30);
});

test("QA reference case: 500 juta, DP 20%, 7%, 20 tahun", () => {
  assert.equal(monthlyInstallment({ price: 500_000_000, downPaymentPct: 20, annualRatePct: 7, years: 20 }), 3_101_196);
});
