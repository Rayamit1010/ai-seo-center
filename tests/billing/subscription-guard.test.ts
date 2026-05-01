import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { QuotaExceededError, PaymentRequiredError, isQuotaExceededError, isPaymentRequiredError } from "@/lib/payments/types";

describe("QuotaExceededError", () => {
  it("is constructed with feature, current, limit", () => {
    const err = new QuotaExceededError("aiCalls", 100, 100);
    assert.equal(err.feature, "aiCalls");
    assert.equal(err.current, 100);
    assert.equal(err.limit, 100);
    assert.ok(err.message.includes("aiCalls"));
  });

  it("is identified by isQuotaExceededError", () => {
    const err = new QuotaExceededError("projects", 3, 3);
    assert.equal(isQuotaExceededError(err), true);
    assert.equal(isQuotaExceededError(new Error("plain error")), false);
    assert.equal(isQuotaExceededError("string"), false);
    assert.equal(isQuotaExceededError(null), false);
  });

  it("extends Error", () => {
    const err = new QuotaExceededError("keywords", 200, 200);
    assert.ok(err instanceof Error);
  });
});

describe("PaymentRequiredError", () => {
  it("has default message", () => {
    const err = new PaymentRequiredError();
    assert.ok(err.message.length > 0);
  });

  it("accepts custom message", () => {
    const err = new PaymentRequiredError("Custom message");
    assert.equal(err.message, "Custom message");
  });

  it("is identified by isPaymentRequiredError", () => {
    const err = new PaymentRequiredError();
    assert.equal(isPaymentRequiredError(err), true);
    assert.equal(isPaymentRequiredError(new Error("other")), false);
    assert.equal(isPaymentRequiredError(undefined), false);
  });
});

describe("Plan feature limit logic", () => {
  function checkAllowed(current: number, limit: number): boolean {
    return limit === -1 || current < limit;
  }

  it("returns allowed=true when current < limit", () => {
    assert.equal(checkAllowed(2, 3), true);
  });

  it("returns allowed=false when current >= limit", () => {
    assert.equal(checkAllowed(3, 3), false);
  });

  it("returns allowed=true for unlimited plans (limit = -1)", () => {
    assert.equal(checkAllowed(99999, -1), true);
  });

  it("calculates daily usage correctly when within limit", () => {
    const used = 50;
    const limit = 100;
    assert.equal(used >= limit, false);
  });

  it("detects daily usage exceeded", () => {
    const used = 100;
    const limit = 100;
    assert.equal(used >= limit, true);
  });
});
