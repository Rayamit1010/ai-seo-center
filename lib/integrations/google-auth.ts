import { JWT } from "google-auth-library";

type GoogleServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
  token_uri?: string;
};

const globalForGoogleAuth = globalThis as unknown as {
  googleServiceAccountCredentials?: GoogleServiceAccountCredentials | null;
  googleJwtClients?: Map<string, JWT>;
};

const googleJwtClients = globalForGoogleAuth.googleJwtClients ?? new Map<string, JWT>();

if (process.env.NODE_ENV !== "production") {
  globalForGoogleAuth.googleJwtClients = googleJwtClients;
}

function parseServiceAccountJson(raw: string) {
  const parsed = JSON.parse(raw) as GoogleServiceAccountCredentials;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Google service account JSON is missing client_email or private_key.");
  }

  return {
    ...parsed,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

export function getGoogleServiceAccountCredentials() {
  if (globalForGoogleAuth.googleServiceAccountCredentials !== undefined) {
    return globalForGoogleAuth.googleServiceAccountCredentials;
  }

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    globalForGoogleAuth.googleServiceAccountCredentials = null;
    return null;
  }

  try {
    const credentials = raw.startsWith("{")
      ? parseServiceAccountJson(raw)
      : parseServiceAccountJson(Buffer.from(raw, "base64").toString("utf8"));

    globalForGoogleAuth.googleServiceAccountCredentials = credentials;
    return credentials;
  } catch (error) {
    console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", error);
    globalForGoogleAuth.googleServiceAccountCredentials = null;
    return null;
  }
}

export function isGoogleServiceAccountConfigured() {
  return Boolean(getGoogleServiceAccountCredentials());
}

function getJwtClient(scopes: string[]) {
  const credentials = getGoogleServiceAccountCredentials();
  if (!credentials) {
    return null;
  }

  const scopeKey = [...new Set(scopes)].sort().join(" ");
  const existing = googleJwtClients.get(scopeKey);
  if (existing) {
    return existing;
  }

  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes,
  });

  googleJwtClients.set(scopeKey, client);
  return client;
}

export async function getGoogleAccessToken(scopes: string[]) {
  const client = getJwtClient(scopes);
  if (!client) {
    return null;
  }

  const token = await client.getAccessToken();
  return typeof token === "string" ? token : token?.token || null;
}
