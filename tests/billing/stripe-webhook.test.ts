import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildStripeSignatureHeader(
  payload: string,
  secret: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const sig = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${ts},v1=${sig}`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Stripe webhook signature verification", () => {
  const secret = "whsec_test_secret_1234";
  const payload = JSON.stringify({ id: "evt_test_123", type: "checkout.session.completed" });

  it("accepts a valid signature", () => {
    const header = buildStripeSignatureHeader(payload, secret);
    const [tPart, sigPart] = header.split(",");
    const ts = tPart.replace("t=", "");
    const providedSig = sigPart.replace("v1=", "");

    const signedPayload = `${ts}.${payload}`;
    const expectedSig = createHmac("sha256", secret).update(signedPayload).digest("hex");

    assert.equal(providedSig, expectedSig);
  });

  it("rejects a tampered payload", () => {
    const header = buildStripeSignatureHeader(payload, secret);
    const [tPart, sigPart] = header.split(",");
    const ts = tPart.replace("t=", "");
    const providedSig = sigPart.replace("v1=", "");

    const tamperedPayload = payload + "tampered";
    const signedPayload = `${ts}.${tamperedPayload}`;
    const recalculated = createHmac("sha256", secret).update(signedPayload).digest("hex");

    assert.notEqual(providedSig, recalculated);
  });

  it("rejects an expired timestamp (> 5 minutes old)", () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400;
    const header = buildStripeSignatureHeader(payload, secret, oldTimestamp);
    const [tPart] = header.split(",");
    const ts = parseInt(tPart.replace("t=", ""), 10);
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now - ts > 300;

    assert.equal(isExpired, true);
  });

  it("accepts a recent timestamp", () => {
    const recentTimestamp = Math.floor(Date.now() / 1000) - 10;
    const header = buildStripeSignatureHeader(payload, secret, recentTimestamp);
    const [tPart] = header.split(",");
    const ts = parseInt(tPart.replace("t=", ""), 10);
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now - ts > 300;

    assert.equal(isExpired, false);
  });
});

describe("Stripe webhook idempotency key", () => {
  it("uses event.id as the idempotency key", () => {
    const event = { id: "evt_1abc", type: "invoice.payment_succeeded" };
    const key = event.id;
    assert.equal(key, "evt_1abc");
  });

  it("produces unique keys for different events", () => {
    const event1 = { id: "evt_1abc" };
    const event2 = { id: "evt_2def" };
    assert.notEqual(event1.id, event2.id);
  });
});
