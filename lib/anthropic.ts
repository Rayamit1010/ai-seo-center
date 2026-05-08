import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { decryptSecret, maskSecret } from "@/lib/crypto";

export type AIProviderId = "claude" | "chatgpt" | "gemini" | "grok" | "groq" | "openrouter";

export interface AIRequestOptions {
  userId?: string;
  preferredProviders?: AIProviderId[];
  allowFallback?: boolean;
  task?: string;
}

interface ProviderDefinition {
  id: AIProviderId;
  name: string;
  transport: "anthropic" | "openai";
  url: string;
  envKey: string | undefined;
  defaultModel: string;
  tokenField?: "max_tokens" | "max_completion_tokens";
  authHeader: (key: string) => Record<string, string>;
}

interface ResolvedProvider extends ProviderDefinition {
  apiKey?: string;
  model: string;
  source: "database" | "environment" | "none";
  cooldownUntil: number | null;
}

interface ProviderResolution {
  order: AIProviderId[];
  loopEnabled: boolean;
  cooldownMinutes: number;
  providers: Record<AIProviderId, ResolvedProvider>;
}

interface ProviderMetrics {
  attempts: number;
  successes: number;
  failures: number;
  consecutiveFailures: number;
  failovers: number;
  totalLatencyMs: number;
  lastLatencyMs: number | null;
  lastError: string | null;
  lastUsedAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  tasks: Record<string, number>;
}

const DEFAULT_PROVIDER_ORDER: AIProviderId[] = [
  "groq",
  "grok",
  "gemini",
  "claude",
  "chatgpt",
  "openrouter",
];

const PROVIDERS: Record<AIProviderId, ProviderDefinition> = {
  claude: {
    id: "claude",
    name: "Claude",
    transport: "anthropic",
    url: "https://api.anthropic.com/v1/messages",
    envKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: "claude-sonnet-4-5-20250514",
    authHeader: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
  },
  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT",
    transport: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    envKey: process.env.OPENAI_API_KEY,
    defaultModel: "gpt-4o",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    transport: "openai",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    envKey: process.env.GEMINI_API_KEY,
    defaultModel: "gemini-2.5-flash",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  grok: {
    id: "grok",
    name: "Grok",
    transport: "openai",
    url: "https://api.x.ai/v1/chat/completions",
    envKey: process.env.XAI_API_KEY,
    defaultModel: "grok-4-1-fast-reasoning",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  groq: {
    id: "groq",
    name: "Groq",
    transport: "openai",
    url: "https://api.groq.com/openai/v1/chat/completions",
    envKey: process.env.GROQ_API_KEY,
    defaultModel: "llama-3.3-70b-versatile",
    tokenField: "max_completion_tokens",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    transport: "openai",
    url: "https://openrouter.ai/api/v1/chat/completions",
    envKey: process.env.OPENROUTER_API_KEY,
    defaultModel: "openai/gpt-4o",
    authHeader: (key) => ({
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://techgeekstudio.com",
      "X-Title": "TechGeekStudio SEO Center",
    }),
  },
};

const globalForAi = globalThis as unknown as {
  aiProviderCooldowns?: Map<string, number>;
  aiProviderMetrics?: Map<string, Record<AIProviderId, ProviderMetrics>>;
};

const providerCooldowns =
  globalForAi.aiProviderCooldowns ?? new Map<string, number>();
const providerMetrics =
  globalForAi.aiProviderMetrics ?? new Map<string, Record<AIProviderId, ProviderMetrics>>();

if (process.env.NODE_ENV !== "production") {
  globalForAi.aiProviderCooldowns = providerCooldowns;
  globalForAi.aiProviderMetrics = providerMetrics;
}

function getCooldownKey(userId: string | undefined, providerId: AIProviderId) {
  return `${userId ?? "global"}:${providerId}`;
}

function getMetricsKey(userId?: string) {
  return userId ?? "global";
}

function getEmptyMetrics(): ProviderMetrics {
  return {
    attempts: 0,
    successes: 0,
    failures: 0,
    consecutiveFailures: 0,
    failovers: 0,
    totalLatencyMs: 0,
    lastLatencyMs: null,
    lastError: null,
    lastUsedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    tasks: {},
  };
}

function getMetricsBucket(userId?: string) {
  const key = getMetricsKey(userId);
  const existing = providerMetrics.get(key);
  if (existing) return existing;

  const fresh = {
    claude: getEmptyMetrics(),
    chatgpt: getEmptyMetrics(),
    gemini: getEmptyMetrics(),
    grok: getEmptyMetrics(),
    groq: getEmptyMetrics(),
    openrouter: getEmptyMetrics(),
  } satisfies Record<AIProviderId, ProviderMetrics>;

  providerMetrics.set(key, fresh);
  return fresh;
}

function recordProviderAttempt(
  userId: string | undefined,
  providerId: AIProviderId,
  task: string | undefined,
  latencyMs: number,
  outcome: "success" | "failure"
) {
  const bucket = getMetricsBucket(userId);
  const metrics = bucket[providerId];
  const now = Date.now();

  metrics.attempts += 1;
  metrics.lastLatencyMs = latencyMs;
  metrics.totalLatencyMs += latencyMs;
  metrics.lastUsedAt = now;

  if (task) {
    metrics.tasks[task] = (metrics.tasks[task] ?? 0) + 1;
  }

  if (outcome === "success") {
    metrics.successes += 1;
    metrics.consecutiveFailures = 0;
    metrics.lastSuccessAt = now;
    metrics.lastError = null;
    return;
  }

  metrics.failures += 1;
  metrics.consecutiveFailures += 1;
  metrics.lastFailureAt = now;
}

function recordProviderFailure(
  userId: string | undefined,
  providerId: AIProviderId,
  task: string | undefined,
  latencyMs: number,
  error: unknown
) {
  recordProviderAttempt(userId, providerId, task, latencyMs, "failure");
  const bucket = getMetricsBucket(userId);
  bucket[providerId].lastError = compactError(error).slice(0, 220);
}

function recordProviderFailover(userId: string | undefined, providerId: AIProviderId) {
  const bucket = getMetricsBucket(userId);
  bucket[providerId].failovers += 1;
}

async function persistProviderEvent(params: {
  userId?: string;
  providerId: AIProviderId;
  task?: string;
  operation: string;
  success: boolean;
  failover?: boolean;
  latencyMs: number;
  errorMessage?: string | null;
}) {
  if (!params.userId) return;

  try {
    await prisma.aIProviderEvent.create({
      data: {
        userId: params.userId,
        providerId: params.providerId,
        task: params.task,
        operation: params.operation,
        success: params.success,
        failover: params.failover ?? false,
        latencyMs: params.latencyMs,
        errorMessage: params.errorMessage,
      },
    });
  } catch (error) {
    console.error("Failed to persist AI telemetry event:", error);
  }
}

function normalizePreferredProviders(preferred?: AIProviderId[]) {
  if (!preferred?.length) return null;
  const unique = preferred.filter(
    (providerId, index) => providerId in PROVIDERS && preferred.indexOf(providerId) === index
  );
  return unique.length > 0 ? unique : null;
}

function buildProviderAttemptOrder(
  resolution: ProviderResolution,
  preferredProviders: AIProviderId[] | null,
  shouldFallback: boolean
) {
  if (!preferredProviders?.length) {
    return resolution.order;
  }

  if (!shouldFallback) {
    return preferredProviders;
  }

  const remaining = resolution.order.filter(
    (providerId) => !preferredProviders.includes(providerId)
  );

  return [...preferredProviders, ...remaining];
}

function getCooldownUntil(userId: string | undefined, providerId: AIProviderId) {
  const retryAt = providerCooldowns.get(getCooldownKey(userId, providerId));
  if (!retryAt) return null;
  if (retryAt <= Date.now()) {
    providerCooldowns.delete(getCooldownKey(userId, providerId));
    return null;
  }
  return retryAt;
}

function markProviderCooldown(
  userId: string | undefined,
  providerId: AIProviderId,
  cooldownMinutes: number
) {
  providerCooldowns.set(
    getCooldownKey(userId, providerId),
    Date.now() + cooldownMinutes * 60_000
  );
}

function normalizeProviderOrder(raw: string | null | undefined) {
  if (!raw) return DEFAULT_PROVIDER_ORDER;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PROVIDER_ORDER;

    const legacyDefaultOrders = [
      ["claude", "chatgpt", "gemini", "grok"],
      ["groq", "grok", "gemini", "claude", "chatgpt"],
    ];
    if (legacyDefaultOrders.some(
      (legacy) =>
        parsed.length === legacy.length &&
        parsed.every((value: unknown, index: number) => value === legacy[index])
    )) {
      return DEFAULT_PROVIDER_ORDER;
    }

    const ordered = parsed.filter(
      (value): value is AIProviderId =>
        typeof value === "string" && value in PROVIDERS
    );

    const missing = DEFAULT_PROVIDER_ORDER.filter(
      (providerId) => !ordered.includes(providerId)
    );

    return [...ordered, ...missing];
  } catch {
    return DEFAULT_PROVIDER_ORDER;
  }
}

function compactError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function shouldFailover(error: unknown) {
  const message = compactError(error).toLowerCase();

  if (error instanceof Anthropic.APIError) {
    return [400, 401, 402, 403, 408, 429, 500, 502, 503, 504, 529].includes(
      error.status ?? 500
    );
  }

  return (
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("credit") ||
    message.includes("insufficient") ||
    message.includes("overloaded") ||
    message.includes("temporarily unavailable") ||
    message.includes("timeout") ||
    message.includes("exceeded") ||
    message.includes("not configured") ||
    message.includes("api error 4") ||
    message.includes("api error 5") ||
    message.includes("streaming error 4") ||
    message.includes("streaming error 5")
  );
}

async function resolveProviders(userId?: string): Promise<ProviderResolution> {
  const config = userId
    ? await prisma.agentConfig.findUnique({ where: { userId } })
    : null;

  const order = normalizeProviderOrder(config?.providerOrder);
  const cooldownMinutes = config?.providerCooldownMins ?? 15;

  const dbKeys = {
    chatgpt: decryptSecret(config?.chatgptApiKeyEnc),
    claude: decryptSecret(config?.claudeApiKeyEnc),
    gemini: decryptSecret(config?.geminiApiKeyEnc),
    grok: decryptSecret(config?.grokApiKeyEnc),
    groq: decryptSecret(config?.groqApiKeyEnc),
    openrouter: decryptSecret(config?.openrouterApiKeyEnc),
  } satisfies Record<AIProviderId, string | undefined>;

  const modelOverrides = {
    chatgpt: config?.chatgptModel,
    claude: config?.claudeModel,
    gemini: config?.geminiModel,
    grok: config?.grokModel,
    groq: config?.groqModel,
    openrouter: config?.openrouterModel,
  } satisfies Record<AIProviderId, string | null | undefined>;

  const providers = Object.fromEntries(
    (Object.keys(PROVIDERS) as AIProviderId[]).map((providerId) => {
      const definition = PROVIDERS[providerId];
      const databaseKey = dbKeys[providerId];
      const apiKey = databaseKey || definition.envKey;
      const source = databaseKey
        ? "database"
        : definition.envKey
          ? "environment"
          : "none";

      return [
        providerId,
        {
          ...definition,
          apiKey,
          source,
          model: modelOverrides[providerId] || definition.defaultModel,
          cooldownUntil: getCooldownUntil(userId, providerId),
        } satisfies ResolvedProvider,
      ];
    })
  ) as Record<AIProviderId, ResolvedProvider>;

  return {
    order,
    loopEnabled: config?.providerLoopEnabled ?? true,
    cooldownMinutes,
    providers,
  };
}

function sortProviders(resolution: ProviderResolution) {
  const ordered = resolution.order.map((providerId) => resolution.providers[providerId]);
  const ready = ordered.filter((provider) => provider.apiKey && !provider.cooldownUntil);
  const cooling = ordered.filter((provider) => provider.apiKey && provider.cooldownUntil);
  const missing = ordered.filter((provider) => !provider.apiKey);

  cooling.sort((left, right) => (left.cooldownUntil ?? 0) - (right.cooldownUntil ?? 0));

  if (ready.length > 0) {
    return [...ready, ...cooling, ...missing];
  }

  if (cooling.length > 0) {
    return [...cooling, ...missing];
  }

  return ordered;
}

async function callAnthropicProvider(
  provider: ResolvedProvider,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
) {
  if (!provider.apiKey) {
    throw new Error(`${provider.name} API key not configured`);
  }

  const client = new Anthropic({ apiKey: provider.apiKey });
  const response = await client.messages.create({
    model: provider.model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text response from ${provider.name}`);
  }

  return textBlock.text;
}

async function streamAnthropicProvider(
  provider: ResolvedProvider,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number
) {
  if (!provider.apiKey) {
    throw new Error(`${provider.name} API key not configured`);
  }

  const client = new Anthropic({ apiKey: provider.apiKey });
  return client.messages.stream({
    model: provider.model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
}

async function callOpenAICompatible(
  provider: ResolvedProvider,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
) {
  if (!provider.apiKey) {
    throw new Error(`${provider.name} API key not configured`);
  }

  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...provider.authHeader(provider.apiKey),
    },
    body: JSON.stringify({
      model: provider.model,
      [provider.tokenField ?? "max_tokens"]: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(
      `${provider.name} API error ${response.status}: ${await response.text()}`
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`No text response from ${provider.name}`);
  }

  return text as string;
}

async function streamOpenAICompatible(
  provider: ResolvedProvider,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number
) {
  if (!provider.apiKey) {
    throw new Error(`${provider.name} API key not configured`);
  }

  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...provider.authHeader(provider.apiKey),
    },
    body: JSON.stringify({
      model: provider.model,
      [provider.tokenField ?? "max_tokens"]: maxTokens,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `${provider.name} streaming error ${response.status}: ${await response.text()}`
    );
  }

  return response.body;
}

export async function getAISettingsSummary(userId?: string) {
  const resolution = await resolveProviders(userId);

  return {
    providerOrder: resolution.order,
    providerLoopEnabled: resolution.loopEnabled,
    providerCooldownMins: resolution.cooldownMinutes,
    providers: resolution.order.map((providerId) => {
      const provider = resolution.providers[providerId];

      return {
        id: provider.id,
        name: provider.name,
        model: provider.model,
        hasKey: Boolean(provider.apiKey),
        keyPreview:
          provider.source === "database"
            ? maskSecret(provider.apiKey)
            : provider.source === "environment"
              ? "Environment variable"
              : null,
        source: provider.source,
        cooldownUntil: provider.cooldownUntil
          ? new Date(provider.cooldownUntil).toISOString()
          : null,
      };
    }),
  };
}

export async function getAIHealthSummary(userId?: string) {
  const resolution = await resolveProviders(userId);
  const bucket = getMetricsBucket(userId);

  const providers = resolution.order.map((providerId) => {
    const provider = resolution.providers[providerId];
    const metrics = bucket[providerId];
    const successRate =
      metrics.attempts > 0
        ? Math.round((metrics.successes / metrics.attempts) * 100)
        : 0;
    const averageLatencyMs =
      metrics.attempts > 0 ? Math.round(metrics.totalLatencyMs / metrics.attempts) : null;
    const healthScore = Math.max(
      0,
      Math.min(
        100,
        (provider.apiKey ? 35 : 0) +
          successRate * 0.45 +
          (averageLatencyMs ? Math.max(0, 20 - averageLatencyMs / 250) : 10) -
          metrics.consecutiveFailures * 8
      )
    );

    return {
      id: providerId,
      name: provider.name,
      configured: Boolean(provider.apiKey),
      successRate,
      averageLatencyMs,
      lastLatencyMs: metrics.lastLatencyMs,
      attempts: metrics.attempts,
      successes: metrics.successes,
      failures: metrics.failures,
      consecutiveFailures: metrics.consecutiveFailures,
      failovers: metrics.failovers,
      lastError: metrics.lastError,
      cooldownUntil: provider.cooldownUntil
        ? new Date(provider.cooldownUntil).toISOString()
        : null,
      lastUsedAt: metrics.lastUsedAt ? new Date(metrics.lastUsedAt).toISOString() : null,
      lastSuccessAt: metrics.lastSuccessAt
        ? new Date(metrics.lastSuccessAt).toISOString()
        : null,
      lastFailureAt: metrics.lastFailureAt
        ? new Date(metrics.lastFailureAt).toISOString()
        : null,
      healthScore,
      tasks: metrics.tasks,
      recommended: Boolean(
        provider.apiKey &&
        !provider.cooldownUntil &&
        healthScore ===
          Math.max(
            ...resolution.order.map((id) => {
              const entry = bucket[id];
              const attemptRate =
                entry.attempts > 0 ? Math.round((entry.successes / entry.attempts) * 100) : 0;
              const latency =
                entry.attempts > 0 ? Math.round(entry.totalLatencyMs / entry.attempts) : null;
              return Math.max(
                0,
                Math.min(
                  100,
                  (resolution.providers[id].apiKey ? 35 : 0) +
                    attemptRate * 0.45 +
                    (latency ? Math.max(0, 20 - latency / 250) : 10) -
                    entry.consecutiveFailures * 8
                )
              );
            })
          )
      ),
    };
  });

  return {
    providerOrder: resolution.order,
    loopEnabled: resolution.loopEnabled,
    providers,
    totals: {
      attempts: providers.reduce((sum, provider) => sum + provider.attempts, 0),
      failovers: providers.reduce((sum, provider) => sum + provider.failovers, 0),
      configuredProviders: providers.filter((provider) => provider.configured).length,
      healthyProviders: providers.filter(
        (provider) => provider.configured && !provider.cooldownUntil && provider.healthScore >= 60
      ).length,
    },
  };
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4096,
  options: AIRequestOptions = {}
): Promise<string> {
  const resolution = await resolveProviders(options.userId);
  const preferredProviders = normalizePreferredProviders(options.preferredProviders);
  const shouldFallback =
    options.allowFallback ?? resolution.loopEnabled;
  const derivedResolution = {
    ...resolution,
    order: buildProviderAttemptOrder(
      resolution,
      preferredProviders,
      shouldFallback
    ),
  };
  const providers = shouldFallback
    ? sortProviders(derivedResolution)
    : sortProviders(derivedResolution).slice(0, preferredProviders?.length ?? 1);
  const errors: string[] = [];

  for (const provider of providers) {
    if (!provider.apiKey) {
      errors.push(`${provider.name}: API key not configured`);
      continue;
    }

    const startedAt = Date.now();
    try {
      if (provider.transport === "anthropic") {
        const result = await callAnthropicProvider(
          provider,
          systemPrompt,
          userMessage,
          maxTokens
        );
        recordProviderAttempt(
          options.userId,
          provider.id,
          options.task,
          Date.now() - startedAt,
          "success"
        );
        await persistProviderEvent({
          userId: options.userId,
          providerId: provider.id,
          task: options.task,
          operation: "completion",
          success: true,
          latencyMs: Date.now() - startedAt,
        });
        return result;
      }

      const result = await callOpenAICompatible(
        provider,
        systemPrompt,
        userMessage,
        maxTokens
      );
      recordProviderAttempt(
        options.userId,
        provider.id,
        options.task,
        Date.now() - startedAt,
        "success"
      );
      await persistProviderEvent({
        userId: options.userId,
        providerId: provider.id,
        task: options.task,
        operation: "completion",
        success: true,
        latencyMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      errors.push(`${provider.name}: ${compactError(error).slice(0, 180)}`);
      recordProviderFailure(
        options.userId,
        provider.id,
        options.task,
        latencyMs,
        error
      );
      await persistProviderEvent({
        userId: options.userId,
        providerId: provider.id,
        task: options.task,
        operation: "completion",
        success: false,
        failover: shouldFailover(error),
        latencyMs,
        errorMessage: compactError(error).slice(0, 220),
      });

      if (shouldFailover(error)) {
        markProviderCooldown(
          options.userId,
          provider.id,
          resolution.cooldownMinutes
        );
        recordProviderFailover(options.userId, provider.id);
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `All AI providers failed:\n${errors.map((entry) => `  • ${entry}`).join("\n")}`
  );
}

export async function callClaudeJSON<T>(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 8192,
  options: AIRequestOptions = {}
): Promise<T> {
  const text = await callClaude(systemPrompt, userMessage, maxTokens, options);

  let jsonText = text;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    jsonText = fenced[1].trim();
  }

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    const retry = await callClaude(
      `${systemPrompt}\n\nIMPORTANT: Return only valid raw JSON. No markdown, no prose, no code fences.`,
      userMessage,
      maxTokens,
      options
    );

    let retryJson = retry;
    const retryFenced = retry.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (retryFenced) {
      retryJson = retryFenced[1].trim();
    }

    return JSON.parse(retryJson) as T;
  }
}

export async function streamClaude(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number = 4096,
  options: AIRequestOptions = {}
): Promise<{
  provider: "claude" | "openai";
  providerId: AIProviderId;
  providerName: string;
  stream: unknown;
}> {
  const resolution = await resolveProviders(options.userId);
  const preferredProviders = normalizePreferredProviders(options.preferredProviders);
  const shouldFallback =
    options.allowFallback ?? resolution.loopEnabled;
  const derivedResolution = {
    ...resolution,
    order: buildProviderAttemptOrder(
      resolution,
      preferredProviders,
      shouldFallback
    ),
  };
  const providers = shouldFallback
    ? sortProviders(derivedResolution)
    : sortProviders(derivedResolution).slice(0, preferredProviders?.length ?? 1);
  const errors: string[] = [];

  for (const provider of providers) {
    if (!provider.apiKey) {
      errors.push(`${provider.name}: API key not configured`);
      continue;
    }

    const startedAt = Date.now();
    try {
      if (provider.transport === "anthropic") {
        const stream = await streamAnthropicProvider(
          provider,
          systemPrompt,
          messages,
          maxTokens
        );
        recordProviderAttempt(
          options.userId,
          provider.id,
          options.task,
          Date.now() - startedAt,
          "success"
        );
        await persistProviderEvent({
          userId: options.userId,
          providerId: provider.id,
          task: options.task,
          operation: "stream",
          success: true,
          latencyMs: Date.now() - startedAt,
        });
        return {
          provider: "claude",
          providerId: provider.id,
          providerName: provider.name,
          stream,
        };
      }

      const stream = await streamOpenAICompatible(
        provider,
        systemPrompt,
        messages,
        maxTokens
      );
      recordProviderAttempt(
        options.userId,
        provider.id,
        options.task,
        Date.now() - startedAt,
        "success"
      );
      await persistProviderEvent({
        userId: options.userId,
        providerId: provider.id,
        task: options.task,
        operation: "stream",
        success: true,
        latencyMs: Date.now() - startedAt,
      });
      return {
        provider: "openai",
        providerId: provider.id,
        providerName: provider.name,
        stream,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      errors.push(`${provider.name}: ${compactError(error).slice(0, 180)}`);
      recordProviderFailure(
        options.userId,
        provider.id,
        options.task,
        latencyMs,
        error
      );
      await persistProviderEvent({
        userId: options.userId,
        providerId: provider.id,
        task: options.task,
        operation: "stream",
        success: false,
        failover: shouldFailover(error),
        latencyMs,
        errorMessage: compactError(error).slice(0, 220),
      });

      if (shouldFailover(error)) {
        markProviderCooldown(
          options.userId,
          provider.id,
          resolution.cooldownMinutes
        );
        recordProviderFailover(options.userId, provider.id);
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `All AI streaming providers failed:\n${errors.map((entry) => `  • ${entry}`).join("\n")}`
  );
}
