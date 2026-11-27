import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNextPath } from "../src/lib/auth/redirect.ts";

test("?next= keeps internal pages", () => {
  assert.equal(safeNextPath("/dashboard/leads"), "/dashboard/leads");
  assert.equal(safeNextPath("/dashboard/properties/4/edit?tab=media"), "/dashboard/properties/4/edit?tab=media");
});

test("?next= never leaves the site", () => {
  for (const raw of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, "/\n/evil"]) {
    assert.equal(safeNextPath(raw), "/dashboard", String(raw));
  }
});

test("?next= does not loop back to auth pages", () => {
  assert.equal(safeNextPath("/login"), "/dashboard");
  assert.equal(safeNextPath("/register?x=1"), "/dashboard");
});
