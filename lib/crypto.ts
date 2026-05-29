import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTION_PREFIX = "enc:v1";

function getEncryptionKey() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

  // In production, refuse to start without a proper secret — prevents silently
  // encrypting data with a known fallback that would expose all stored API keys.
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXTAUTH_SECRET (or AUTH_SECRET) must be set in production. " +
        "Refusing to encrypt/decrypt with a weak fallback."
      );
    }
    // Dev/test: use a consistent local secret so encrypted values survive restarts
    return createHash("sha256").update("local-dev-only-not-for-production").digest();
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return undefined;

  try {
    const parts = value.split(":");
    let iv: string | undefined;
    let tag: string | undefined;
    let payload: string | undefined;

    if (parts.length === 5 && `${parts[0]}:${parts[1]}` === ENCRYPTION_PREFIX) {
      [iv, tag, payload] = [parts[2], parts[3], parts[4]];
    } else if (parts.length === 4 && parts[0] === ENCRYPTION_PREFIX) {
      [iv, tag, payload] = [parts[1], parts[2], parts[3]];
    } else {
      return undefined;
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return undefined;
  }
}

export function maskSecret(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 8) return "Configured";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
