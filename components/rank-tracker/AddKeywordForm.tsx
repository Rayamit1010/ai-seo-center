"use client";

import { useState } from "react";
import { toast } from "sonner";

interface TrackedKeywordRow {
  id: string;
  keyword: string;
  targetUrl: string;
  targetDomain: string;
  country: string;
  device: string;
  currentPosition: number | null;
  previousPosition: number | null;
  change: number | null;
  lastCheckedAt: string | null;
}

interface Props {
  onAdd: (keyword: TrackedKeywordRow) => void;
  remainingQuota: number;
}

const COUNTRIES = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
];

export function AddKeywordForm({ onAdd, remainingQuota }: Props) {
  const [keyword, setKeyword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [country, setCountry] = useState("IN");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!keyword.trim()) e.keyword = "Keyword is required";
    if (!targetUrl.trim()) e.targetUrl = "Target URL is required";
    else {
      try { new URL(targetUrl); } catch { e.targetUrl = "Enter a valid URL"; }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rank-tracker/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), targetUrl: targetUrl.trim(), country, device }),
      });
      const json = (await res.json()) as { success?: boolean; data?: TrackedKeywordRow; error?: string };
      if (!res.ok || !json.success) { toast.error(json.error ?? "Failed to add keyword"); return; }
      toast.success("Keyword added!");
      onAdd(json.data!);
      setKeyword("");
      setTargetUrl("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Add Keyword to Track</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {remainingQuota === -1 ? "Unlimited" : `${remainingQuota} remaining`}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <input
            type="text"
            placeholder="Target keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none"
          />
          {errors.keyword && <p className="mt-1 text-xs text-red-400">{errors.keyword}</p>}
        </div>
        <div className="lg:col-span-1">
          <input
            type="url"
            placeholder="https://yoursite.com/page"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none"
          />
          {errors.targetUrl && <p className="mt-1 text-xs text-red-400">{errors.targetUrl}</p>}
        </div>
        <div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value as "desktop" | "mobile")}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select>
          <button
            type="submit"
            disabled={loading || remainingQuota === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Adding…" : "Track"}
          </button>
        </div>
      </div>
    </form>
  );
}
