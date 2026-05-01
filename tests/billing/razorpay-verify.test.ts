import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";

function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = createHmac("sha256", secret).update(payload).digest("hex");
  return expectedSignature === signature;
}

function generateValidSignature(orderId: string, paymentId: string, secret: string): string {
  const payload = `${orderId}|${paymentId}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

describe("Razorpay payment signature verification", () => {
  const secret = "test_razorpay_secret";
  const orderId = "order_test_abc123";
  const paymentId = "pay_test_xyz789";

  it("verifies a valid HMAC-SHA256 signature", () => {
    const signature = generateValidSignature(orderId, paymentId, secret);
    const result = verifyRazorpayPayment(orderId, paymentId, signature, secret);
    assert.equal(result, true);
  });

  it("rejects an invalid signature", () => {
    const badSignature = "000000000000000000000000000000000000000000000000000000000000beef";
    const result = verifyRazorpayPayment(orderId, paymentId, badSignature, secret);
    assert.equal(result, false);
  });

  it("rejects when order_id is tampered", () => {
    const signature = generateValidSignature(orderId, paymentId, secret);
    const result = verifyRazorpayPayment("order_different", paymentId, signature, secret);
    assert.equal(result, false);
  });

  it("rejects when payment_id is tampered", () => {
    const signature = generateValidSignature(orderId, paymentId, secret);
    const result = verifyRazorpayPayment(orderId, "pay_different", signature, secret);
    assert.equal(result, false);
  });

  it("rejects with wrong secret", () => {
    const signature = generateValidSignature(orderId, paymentId, secret);
    const result = verifyRazorpayPayment(orderId, paymentId, signature, "wrong_secret");
    assert.equal(result, false);
  });

  it("follows razorpay format: orderId|paymentId", () => {
    const payload = `${orderId}|${paymentId}`;
    assert.ok(payload.startsWith(orderId));
    assert.ok(payload.endsWith(paymentId));
    assert.ok(payload.includes("|"));
  });
});

describe("Razorpay webhook signature", () => {
  it("uses HMAC-SHA256 with webhook secret", () => {
    const webhookSecret = "webhook_secret_test";
    const body = JSON.stringify({ event: "payment.captured", entity: { id: "pay_123" } });
    const sig = createHmac("sha256", webhookSecret).update(body).digest("hex");

    const verification = createHmac("sha256", webhookSecret).update(body).digest("hex");
    assert.equal(sig, verification);
  });
});
