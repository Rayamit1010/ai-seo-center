"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { BriefDisplay } from "@/components/brief/BriefDisplay";
import type { BriefOutput } from "@/lib/prompts/brief-generator";

const LOADING_STEPS = ["Fetching SERP data...", "Analyzing competitors...", "Generating brief..."];

interface BriefResponse {
  success?: boolean;
  data?: { brief: { id: string; keyword: string }; parsed: BriefOutput };
  error?: string;
}

export function BriefGenerator() {
  const [keyword, setKeyword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [country, setCountry] = useState("IN");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [brief, setBrief] = useState<BriefOutput | null>(null);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      intervalRef.current = setInterval(() => {
        setStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setStepIdx(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) { toast.error("Enter a keyword"); return; }
    setLoading(true); setError(null); setBrief(null);
    try {
      const res = await fetch("/api/brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), targetUrl: targetUrl.trim() || undefined, country }),
      });
      const json = (await res.json()) as BriefResponse;
      if (!res.ok || !json.success) { setError(json.error ?? "Generation failed"); return; }
      setBrief(json.data!.parsed);
      setBriefId(json.data!.brief.id);
      toast.success("Brief generated!");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleGenerate} className="rounded-xl border border-border bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Target keyword (e.g. best SEO tools)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <input
              type="url"
              placeholder="Target URL (optional)"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="CA">Canada</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "..." : "Generate"}
            </button>
          </div>
        </div>
      </form>

      {loading && (
        <div className="flex h-32 items-center justify-center gap-3 rounded-xl border border-border bg-surface">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">{LOADING_STEPS[stepIdx]}</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-xs text-primary underline">Dismiss</button>
        </div>
      )}

      {brief && briefId && <BriefDisplay brief={brief} briefId={briefId} keyword={keyword} />}
    </div>
  );
}
