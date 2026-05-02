"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { KeywordTable } from "@/components/rank-tracker/KeywordTable";
import { RankChart } from "@/components/rank-tracker/RankChart";
import { AddKeywordForm } from "@/components/rank-tracker/AddKeywordForm";

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

interface RankHistoryEntry {
  checkedAt: string;
  position: number | null;
}

interface Overview {
  totalKeywords: number;
  improved: number;
  dropped: number;
  unchanged: number;
  avgPosition: number | null;
  topGainers: { keyword: string; change: number; position: number | null }[];
  topLosers: { keyword: string; change: number; position: number | null }[];
}

export default function RankTrackerPage() {
  const [keywords, setKeywords] = useState<TrackedKeywordRow[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<TrackedKeywordRow | null>(null);
  const [history, setHistory] = useState<RankHistoryEntry[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kwRes, ovRes] = await Promise.all([
        fetch("/api/rank-tracker/keywords"),
        fetch("/api/rank-tracker/overview"),
      ]);
      const kwJson = (await kwRes.json()) as { success?: boolean; data?: TrackedKeywordRow[] };
      const ovJson = (await ovRes.json()) as { success?: boolean; data?: Overview };
      if (kwJson.success) setKeywords(kwJson.data ?? []);
      if (ovJson.success) setOverview(ovJson.data ?? null);
    } catch {
      toast.error("Failed to load rank tracker data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/rank-tracker/keywords/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeywords((prev) => prev.filter((k) => k.id !== id));
        if (selectedKeyword?.id === id) setSelectedKeyword(null);
        toast.success("Keyword removed");
      }
    } catch { toast.error("Failed to remove keyword"); }
  };

  const handleCheckNow = async (id: string) => {
    setIsChecking(id);
    try {
      const res = await fetch("/api/rank-tracker/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywordIds: [id] }),
      });
      if (res.ok) { toast.success("Rank check queued! Results in a few minutes."); }
      else { toast.error("Failed to queue rank check"); }
    } catch { toast.error("Something went wrong"); }
    finally { setIsChecking(null); }
  };

  const handleSelectKeyword = async (id: string) => {
    const kw = keywords.find((k) => k.id === id) ?? null;
    setSelectedKeyword(kw);
    if (!kw) return;
    try {
      const res = await fetch(`/api/rank-tracker/keywords/${id}`);
      const json = (await res.json()) as { success?: boolean; data?: { rankHistory: RankHistoryEntry[] } };
      if (json.success) setHistory(json.data?.rankHistory ?? []);
    } catch { setHistory([]); }
  };

  const statCards = [
    { label: "Total Keywords", value: overview?.totalKeywords ?? 0, icon: BarChart3, color: "text-primary" },
    { label: "Improved", value: overview?.improved ?? 0, icon: TrendingUp, color: "text-green-400" },
    { label: "Dropped", value: overview?.dropped ?? 0, icon: TrendingDown, color: "text-red-400" },
    { label: "Avg Position", value: overview?.avgPosition != null ? overview.avgPosition.toFixed(1) : "–", icon: Minus, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Rank Tracker</h1>
        <p className="mt-1 text-sm text-text-secondary">Monitor your keyword positions daily across search engines.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs text-text-muted">{card.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      <AddKeywordForm
        onAdd={(kw) => setKeywords((prev) => [kw, ...prev])}
        remainingQuota={overview ? (overview.totalKeywords >= 200 ? 0 : 200 - overview.totalKeywords) : 200}
      />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : keywords.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <TrendingUp className="mx-auto mb-4 h-12 w-12 text-text-muted" />
          <p className="text-text-secondary">No keywords tracked yet. Add your first keyword above.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <KeywordTable
              keywords={keywords}
              onDelete={handleDelete}
              onCheckNow={handleCheckNow}
              isChecking={isChecking}
              onSelect={handleSelectKeyword}
            />
          </div>
          {selectedKeyword && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">{selectedKeyword.keyword}</h3>
              <RankChart history={history} keyword={selectedKeyword.keyword} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
