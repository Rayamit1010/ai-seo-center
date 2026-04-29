"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowDown, ArrowUp, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProviderId = "claude" | "chatgpt" | "gemini" | "grok" | "groq";

interface ProviderSettings {
  id: ProviderId;
  name: string;
  model: string;
  hasKey: boolean;
  keyPreview: string | null;
  source: "database" | "environment" | "none";
  cooldownUntil: string | null;
}

interface SettingsResponse {
  success: boolean;
  data: {
    fromEmail: string;
    fromName: string;
    dailyEmailLimit: number;
    providerOrder: string;
    providerLoopEnabled: boolean;
    providerCooldownMins: number;
    ai: {
      providerOrder: ProviderId[];
      providerLoopEnabled: boolean;
      providerCooldownMins: number;
      providers: ProviderSettings[];
    };
  };
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok (xAI)",
  groq: "Groq",
};

const PROVIDER_HELP: Record<ProviderId, string> = {
  claude: "Use an Anthropic key for Claude models.",
  chatgpt: "Use an OpenAI key for ChatGPT models.",
  gemini: "Use a Google Gemini API key here.",
  grok: "Use an xAI key here. Groq keys will not work in this field.",
  groq: "Use a Groq key here. Groq keys usually start with gsk_.",
};

function isGroqKey(value: string) {
  return value.trim().startsWith("gsk_");
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerOrder, setProviderOrder] = useState<ProviderId[]>([
    "groq",
    "grok",
    "gemini",
    "claude",
    "chatgpt",
  ]);
  const [providerLoopEnabled, setProviderLoopEnabled] = useState(true);
  const [providerCooldownMins, setProviderCooldownMins] = useState(15);
  const [providers, setProviders] = useState<Record<ProviderId, ProviderSettings>>({
    claude: {
      id: "claude",
      name: "Claude",
      model: "claude-sonnet-4-5-20250514",
      hasKey: false,
      keyPreview: null,
      source: "none",
      cooldownUntil: null,
    },
    chatgpt: {
      id: "chatgpt",
      name: "ChatGPT",
      model: "gpt-4o",
      hasKey: false,
      keyPreview: null,
      source: "none",
      cooldownUntil: null,
    },
    gemini: {
      id: "gemini",
      name: "Gemini",
      model: "gemini-2.5-flash",
      hasKey: false,
      keyPreview: null,
      source: "none",
      cooldownUntil: null,
    },
    grok: {
      id: "grok",
      name: "Grok",
      model: "grok-4-1-fast-reasoning",
      hasKey: false,
      keyPreview: null,
      source: "none",
      cooldownUntil: null,
    },
    groq: {
      id: "groq",
      name: "Groq",
      model: "llama-3.3-70b-versatile",
      hasKey: false,
      keyPreview: null,
      source: "none",
      cooldownUntil: null,
    },
  });
  const [apiKeyDrafts, setApiKeyDrafts] = useState<Record<ProviderId, string>>({
    claude: "",
    chatgpt: "",
    gemini: "",
    grok: "",
    groq: "",
  });
  const [clearedProviders, setClearedProviders] = useState<Record<ProviderId, boolean>>({
    claude: false,
    chatgpt: false,
    gemini: false,
    grok: false,
    groq: false,
  });

  const user = session?.user;

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/agent/config", { cache: "no-store" });
      const payload = (await response.json()) as SettingsResponse;

      if (!response.ok || !payload.success) {
        throw new Error("Failed to load settings");
      }

      const ai = payload.data.ai;
      setProviderOrder(ai.providerOrder);
      setProviderLoopEnabled(ai.providerLoopEnabled);
      setProviderCooldownMins(ai.providerCooldownMins);
      setProviders(
        ai.providers.reduce(
          (acc, provider) => {
            acc[provider.id] = provider;
            return acc;
          },
          {} as Record<ProviderId, ProviderSettings>
        )
      );
      setClearedProviders({
        claude: false,
        chatgpt: false,
        gemini: false,
        grok: false,
        groq: false,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load AI settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const moveProvider = (providerId: ProviderId, direction: -1 | 1) => {
    setProviderOrder((current) => {
      const index = current.indexOf(providerId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const clearProviderKey = (providerId: ProviderId) => {
    setApiKeyDrafts((current) => ({ ...current, [providerId]: "" }));
    setClearedProviders((current) => ({ ...current, [providerId]: true }));
    setProviders((current) => ({
      ...current,
      [providerId]: {
        ...current[providerId],
        hasKey: false,
        keyPreview: null,
        source: "none",
      },
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const grokDraft = apiKeyDrafts.grok.trim();
      const groqDraft = apiKeyDrafts.groq.trim();
      const moveGroqKeyFromGrok = isGroqKey(grokDraft) && !groqDraft;

      if (moveGroqKeyFromGrok) {
        toast.info("That key looks like a Groq key, so it will be saved to Groq instead of Grok.");
      }

      const body = {
        providerOrder,
        providerLoopEnabled,
        providerCooldownMins,
        claudeModel: providers.claude.model,
        chatgptModel: providers.chatgpt.model,
        geminiModel: providers.gemini.model,
        grokModel: providers.grok.model,
        groqModel: providers.groq.model,
        claudeApiKey: clearedProviders.claude ? "" : apiKeyDrafts.claude || undefined,
        chatgptApiKey: clearedProviders.chatgpt ? "" : apiKeyDrafts.chatgpt || undefined,
        geminiApiKey: clearedProviders.gemini ? "" : apiKeyDrafts.gemini || undefined,
        grokApiKey: clearedProviders.grok ? "" : moveGroqKeyFromGrok ? "" : apiKeyDrafts.grok || undefined,
        groqApiKey: clearedProviders.groq ? "" : moveGroqKeyFromGrok ? apiKeyDrafts.grok : apiKeyDrafts.groq || undefined,
      };

      const response = await fetch("/api/agent/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as SettingsResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Save failed");
      }

      setApiKeyDrafts({
        claude: "",
        chatgpt: "",
        gemini: "",
        grok: "",
        groq: "",
      });
      setClearedProviders({
        claude: false,
        chatgpt: false,
        gemini: false,
        grok: false,
        groq: false,
      });

      toast.success("AI orchestration settings saved");
      await loadSettings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">Settings</h2>
          <p className="mt-1 text-text-secondary">
            Control AI providers, fallback order, cooldown handling, and your saved API keys.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadSettings()} disabled={loading || saving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => void saveSettings()} disabled={loading || saving}>
            <Save className="mr-2 h-4 w-4" />
            Save AI Settings
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Name</label>
            <Input value={user?.name || ""} readOnly className="bg-background" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Email</label>
            <Input value={user?.email || ""} readOnly className="bg-background" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Company</label>
            <Input value={user?.company || "TechGeekStudio"} readOnly className="bg-background" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Website</label>
            <Input value={user?.website || "https://techgeekstudio.com"} readOnly className="bg-background" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fallback Engine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
              <input
                type="checkbox"
                className="mt-1"
                checked={providerLoopEnabled}
                onChange={(event) => setProviderLoopEnabled(event.target.checked)}
              />
              <div>
                <p className="font-medium text-text-primary">Enable automatic provider loop</p>
                <p className="text-sm text-text-secondary">
                  When one provider fails or hits quota, requests roll forward to the next provider automatically.
                </p>
              </div>
            </label>

            <div className="rounded-lg border border-border bg-background p-4">
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Cooldown After Failure (minutes)
              </label>
              <Input
                type="number"
                min={1}
                max={120}
                value={providerCooldownMins}
                onChange={(event) => setProviderCooldownMins(Number(event.target.value || 15))}
              />
              <p className="mt-2 text-sm text-text-secondary">
                Providers that hit quota or temporary failures are cooled down before re-entering the loop.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="font-medium text-text-primary">Current fallback order</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {providerOrder.map((providerId, index) => (
                <div key={providerId} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
                  <span className="text-sm text-text-primary">{index + 1}. {PROVIDER_LABELS[providerId]}</span>
                  <button
                    type="button"
                    onClick={() => moveProvider(providerId, -1)}
                    disabled={index === 0}
                    className="text-text-secondary disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProvider(providerId, 1)}
                    disabled={index === providerOrder.length - 1}
                    className="text-text-secondary disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {providerOrder.map((providerId) => {
          const provider = providers[providerId];

          return (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{provider.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={provider.hasKey ? "success" : "outline"}>
                      {provider.hasKey ? "Ready" : "Missing key"}
                    </Badge>
                    {provider.cooldownUntil ? (
                      <Badge variant="warning">Cooling down</Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">Model</label>
                    <Input
                      value={provider.model}
                      onChange={(event) =>
                        setProviders((current) => ({
                          ...current,
                          [provider.id]: {
                            ...current[provider.id],
                            model: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="min-w-36">
                    <label className="mb-1.5 block text-sm font-medium text-text-primary">Source</label>
                    <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-secondary">
                      {provider.source === "database"
                        ? "Saved here"
                        : provider.source === "environment"
                          ? "Environment"
                          : "Not set"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">
                    API Key
                  </label>
                  <Input
                    type="password"
                    value={apiKeyDrafts[provider.id]}
                    onChange={(event) =>
                      {
                        setApiKeyDrafts((current) => ({
                          ...current,
                          [provider.id]: event.target.value,
                        }));
                        setClearedProviders((current) => ({
                          ...current,
                          [provider.id]: false,
                        }));
                      }
                    }
                    placeholder={
                      provider.keyPreview
                        ? `Current: ${provider.keyPreview}`
                        : `Paste ${provider.name} API key`
                    }
                  />
                  <p className="mt-2 text-xs text-text-muted">
                    {PROVIDER_HELP[provider.id]}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-background p-3">
                  <div className="text-sm text-text-secondary">
                    <p>
                      Saved key: {provider.keyPreview || "None"}
                    </p>
                    <p>
                      Cooldown: {provider.cooldownUntil ? new Date(provider.cooldownUntil).toLocaleString() : "Available"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => clearProviderKey(provider.id)}
                    disabled={saving}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Saved Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
