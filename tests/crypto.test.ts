import assert from "node:assert/strict";
import test from "node:test";
import { decryptSecret, encryptSecret } from "../lib/crypto";

test("encrypted secrets round-trip with the current enc:v1 format", () => {
  process.env.NEXTAUTH_SECRET = "crypto-test-secret";

  const encrypted = encryptSecret(
    "xai-example-secret-value-that-should-stay-readable-after-save"
  );

  assert.match(encrypted, /^enc:v1:/);
  assert.equal(
    decryptSecret(encrypted),
    "xai-example-secret-value-that-should-stay-readable-after-save"
  );
});

test("invalid encrypted payloads fail safely", () => {
  process.env.NEXTAUTH_SECRET = "crypto-test-secret";

  assert.equal(decryptSecret("enc:v1:not-a-valid-payload"), undefined);
  assert.equal(decryptSecret("totally-invalid"), undefined);
  assert.equal(decryptSecret(null), undefined);
});
