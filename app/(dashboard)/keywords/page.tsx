"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { KeywordResearchPanel } from "@/components/keyword-research/KeywordResearchPanel";
import { GapAnalysis } from "@/components/keyword-research/GapAnalysis";

type Tab = "research" | "gap" | "history";

interface HistoryItem {
  id: string;
  keyword: string;
  country: string;
  createdAt: string;
  resultsCount: number;
}

export default function KeywordsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("research");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/keyword-research/history");
      const json = (await res.json()) as { success?: boolean; data?: HistoryItem[] };
      if (json.success) setHistory(json.data ?? []);
    } catch {
      /* silent */
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") void loadHistory();
  }, [activeTab, loadHistory]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "research", label: "Research" },
    { key: "gap", label: "Gap Analysis" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Keyword Research</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Discover keywords, analyze gaps, and review past research.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "research" && <KeywordResearchPanel />}

      {activeTab === "gap" && <GapAnalysis />}

      {activeTab === "history" && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Recent Searches</h2>
          </div>
          {historyLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
              <Search className="h-10 w-10" />
              <p className="text-sm">No research history yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Keyword</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Country</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Results</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-background/50"
                    onClick={() => setActiveTab("research")}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{item.keyword}</td>
                    <td className="px-4 py-3 text-text-secondary uppercase text-xs">{item.country}</td>
                    <td className="px-4 py-3 text-text-muted">{item.resultsCount}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
