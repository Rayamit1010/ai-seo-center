"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Copy,
  GitCompare,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProviderId = "auto" | "claude" | "chatgpt" | "gemini" | "grok" | "groq";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
}

interface CompareResult {
  providerId: Exclude<ProviderId, "auto">;
  ok: boolean;
  content?: string;
  error?: string;
}

const quickPrompts = [
  "Run a full SEO audit on techgeekstudio.com",
  "Build a 30-day AI-first content calendar for an SEO agency",
  "Create a high-authority backlink acquisition plan for a B2B SaaS site",
  "How should I improve Core Web Vitals for a Next.js marketing site?",
  "What keywords should an AI development agency target first?",
  "Compare SEO positioning angles for Claude, ChatGPT, Gemini, and Grok content",
];

const compareProviders: Array<Exclude<ProviderId, "auto">> = [
  "claude",
  "chatgpt",
  "gemini",
  "grok",
  "groq",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeProvider, setActiveProvider] = useState<ProviderId>("auto");
  const [lastProvider, setLastProvider] = useState<string>("Auto Router");
  const [activeProjectName, setActiveProjectName] = useState<string>("General");
  const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canSend = input.trim().length > 0 && !loading && !compareLoading;
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant" && message.content),
    [messages]
  );

  const loadSessions = async () => {
    try {
      const response = await fetch("/api/chat", { cache: "no-store" });
      const payload = await response.json();
      if (payload.success) {
        setSessions(payload.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadSession = async (nextSessionId: string) => {
    try {
      const response = await fetch(`/api/chat?sessionId=${nextSessionId}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load session");
      }

      setSessionId(nextSessionId);
      setMessages(
        payload.data.messages.map((message: Message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        }))
      );
      setActiveProjectName("Saved session");
      setCompareResults([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load chat session");
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, compareResults]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading || compareLoading) return;

    setInput("");
    setCompareResults([]);
    setActiveProjectName("Resolving...");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const requestBody = {
        message: msg,
        ...(sessionId ? { sessionId } : {}),
        ...(activeProvider !== "auto" ? { provider: activeProvider } : {}),
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let reason = "Failed to start chat";
        try {
          const payload = await response.json();
          reason = payload.reason || payload.error || reason;
        } catch {
          // Keep the default human-friendly message
        }
        throw new Error(reason);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let currentProvider = "";
      let eventBuffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "", provider: "" }]);

      if (!reader) {
        throw new Error("The chat stream did not start correctly");
      }

      const processEvent = (rawEvent: string) => {
        if (!rawEvent.startsWith("data: ")) {
          return;
        }

        try {
          const data = JSON.parse(rawEvent.slice(6));
          if (data.provider) {
            currentProvider = data.provider;
            setLastProvider(data.provider);
            setMessages((prev) => {
              const updated = [...prev];
              if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  provider: data.provider,
                };
              }
              return updated;
            });
          }
          if (data.projectName) {
            setActiveProjectName(data.projectName);
          }
          if (data.text) {
            assistantMessage += data.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                role: "assistant",
                content: assistantMessage,
                provider: updated[updated.length - 1].provider || currentProvider || lastProvider,
              };
              return updated;
            });
          }
          if (data.sessionId) {
            setSessionId(data.sessionId);
            void loadSessions();
          }
        } catch {
          // skip malformed chunks
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        eventBuffer += decoder.decode(value, { stream: true });

        while (eventBuffer.includes("\n\n")) {
          const separatorIndex = eventBuffer.indexOf("\n\n");
          const rawEvent = eventBuffer.slice(0, separatorIndex).trim();
          eventBuffer = eventBuffer.slice(separatorIndex + 2);
          if (rawEvent) {
            processEvent(rawEvent);
          }
        }
      }

      const finalEvent = eventBuffer.trim();
      if (finalEvent) {
        processEvent(finalEvent);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const runCompareMode = async () => {
    const message = input.trim();
    if (!message || loading || compareLoading) return;

    setCompareLoading(true);
    setCompareResults([]);
    try {
      const response = await fetch("/api/chat/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          providers: compareProviders,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Compare mode failed");
      }

      setCompareResults(payload.data);
      toast.success("Compare mode complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Compare mode failed");
    } finally {
      setCompareLoading(false);
    }
  };

  const retryWithNextProvider = async () => {
    const order: ProviderId[] = ["groq", "grok", "gemini", "claude", "chatgpt"];
    const currentIndex = order.findIndex(
      (provider) => provider.toLowerCase() === lastProvider.toLowerCase()
    );
    const nextProvider = currentIndex >= 0 ? order[(currentIndex + 1) % order.length] : "claude";
    setActiveProvider(nextProvider);
    if (latestAssistantMessage) {
      await sendMessage(messages.filter((message) => message.role === "user").slice(-1)[0]?.content);
    }
  };

  const newChat = () => {
    setMessages([]);
    setCompareResults([]);
    setSessionId(null);
    setLastProvider("Auto Router");
    setActiveProjectName("General");
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="hidden w-72 flex-col rounded-2xl border border-border bg-surface md:flex">
        <div className="border-b border-border p-3">
          <Button onClick={newChat} variant="outline" className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <div className="p-3">
          <Card className="border-primary/20 bg-primary-light/30 shadow-none">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-text-primary">AI Router</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Current mode</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="success">{activeProvider === "auto" ? "Smart Auto" : activeProvider}</Badge>
                  <span className="text-xs text-text-secondary">Last used: {lastProvider}</span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Route through</p>
                <Select value={activeProvider} onValueChange={(value) => setActiveProvider(value as ProviderId)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Smart Auto Router</SelectItem>
                    <SelectItem value="claude">Claude</SelectItem>
                    <SelectItem value="chatgpt">ChatGPT</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="grok">Grok</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => void loadSession(session.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                sessionId === session.id ? "bg-primary-light text-primary" : "text-text-secondary"
              }`}
            >
              <p className="truncate font-medium">{session.title}</p>
              <p className="mt-1 text-xs opacity-70">
                {new Date(session.updatedAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold text-text-primary">
                  AI SEO Copilot
                </h2>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                Stream answers, switch providers, or compare multiple AI engines side by side.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Session: {sessionId ? "Saved" : "New"}</Badge>
              <Badge variant="success">Last provider: {lastProvider}</Badge>
              <Badge variant="outline">Project memory: {activeProjectName}</Badge>
              <Button variant="outline" size="sm" onClick={() => void retryWithNextProvider()} disabled={loading || compareLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Next AI
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <MessageSquare className="h-12 w-12 text-text-muted" />
              <p className="mt-4 font-heading text-lg text-text-secondary">AI SEO Assistant</p>
              <p className="mt-1 text-sm text-text-muted">
                Ask for audits, keyword strategies, backlink plans, content ideas, and technical fixes.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-xl border border-border bg-background px-4 py-3 text-left text-sm text-text-secondary transition-colors hover:border-primary/50 hover:text-text-primary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-white"
                        : "border border-border bg-background text-text-primary"
                    }`}
                  >
                    {message.role === "assistant" && message.provider ? (
                      <Badge variant="outline" className="mb-3">
                        {message.provider}
                      </Badge>
                    ) : null}
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none text-text-primary">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content || "..."}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    {message.role === "assistant" && message.content ? (
                      <button
                        onClick={() => copyMessage(message.content)}
                        className="absolute -right-9 top-2 text-text-muted hover:text-text-primary"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {compareResults.length > 0 ? (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-primary" />
                <h3 className="font-heading text-base font-semibold text-text-primary">
                  Compare Mode Results
                </h3>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {compareResults.map((result) => (
                  <Card key={result.providerId} className="border-border/80">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <Badge variant={result.ok ? "success" : "destructive"}>
                          {result.providerId}
                        </Badge>
                        {result.ok ? (
                          <button
                            onClick={() => copyMessage(result.content || "")}
                            className="text-text-muted hover:text-text-primary"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      {result.ok ? (
                        <div className="prose prose-sm max-w-none text-text-primary">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {result.content || ""}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm text-error">{result.error}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              Route: {activeProvider === "auto" ? "Smart Auto" : activeProvider}
            </Badge>
            <Badge variant="outline">Compare: Claude vs ChatGPT vs Gemini vs Grok vs Groq</Badge>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask for audits, strategy, content, links, or technical fixes..."
              className="min-h-[56px] max-h-36 resize-none"
              rows={2}
            />
            <div className="flex flex-col gap-2">
              <Button onClick={() => void sendMessage()} disabled={!canSend} size="icon">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={() => void runCompareMode()}
                disabled={!input.trim() || loading || compareLoading}
                variant="outline"
                size="icon"
              >
                {compareLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitCompare className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
