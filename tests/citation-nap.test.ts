import assert from "node:assert/strict";
import test from "node:test";
import { matchNapInText } from "../lib/services/citation-service";

const biz = {
  name: "Acme Plumbing",
  phone: "+1 (555) 867-5309",
  city: "Austin",
};

test("verified when business name present in body text", () => {
  const result = matchNapInText("Call Acme Plumbing today for fast service in Austin!", biz);
  assert.equal(result.nameMatch, true);
  assert.equal(result.status, "verified");
});

test("inconsistent when business name absent", () => {
  const result = matchNapInText("Great plumbing services available. Call us today.", biz);
  assert.equal(result.nameMatch, false);
  assert.equal(result.status, "inconsistent");
});

test("name match is case-insensitive", () => {
  const result = matchNapInText("acme plumbing — trusted pros", biz);
  assert.equal(result.nameMatch, true);
});

test("phone matches via last-7-digit comparison (flexible formatting)", () => {
  // Page uses a different national format but same digits
  const result = matchNapInText("Acme Plumbing — 867-5309 — Austin TX", biz);
  assert.equal(result.phoneMatch, true);
});

test("phone match works when page omits country code", () => {
  const result = matchNapInText("Acme Plumbing  555 867 5309  Austin", biz);
  assert.equal(result.phoneMatch, true);
});

test("phone mismatch when only last 7 digits differ", () => {
  const result = matchNapInText("Acme Plumbing 555-000-1234 Austin", biz);
  assert.equal(result.phoneMatch, false);
});

test("phoneMatch is null when biz has no phone", () => {
  const result = matchNapInText("Acme Plumbing Austin", { ...biz, phone: null });
  assert.equal(result.phoneMatch, null);
});

test("phoneMatch is null when phone has fewer than 7 digits", () => {
  const result = matchNapInText("Acme Plumbing Austin 12345", { ...biz, phone: "12345" });
  assert.equal(result.phoneMatch, null);
});

test("city match is case-insensitive", () => {
  const result = matchNapInText("Acme Plumbing serves AUSTIN and surrounding areas.", biz);
  assert.equal(result.addressMatch, true);
});

test("addressMatch is null when biz has no city", () => {
  const result = matchNapInText("Acme Plumbing", { ...biz, city: null });
  assert.equal(result.addressMatch, null);
});

test("status is verified only when nameMatch is true, regardless of phone/city", () => {
  const noPhone = { name: "Acme Plumbing", phone: null, city: null };
  const result = matchNapInText("Acme Plumbing", noPhone);
  assert.equal(result.status, "verified");
});
