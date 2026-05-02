"use client";

import { useState } from "react";
import { Loader2, Search, Download, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface KeywordData {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
  trend: number[];
}

interface Props {
  onTrackKeyword?: (keyword: string, targetUrl: string) => void;
}

function formatVolume(volume: number | null): string {
  if (volume === null) return "N/A";
  return volume.toLocaleString();
}

function formatCpc(cpc: number | null): string {
  if (cpc === null) return "N/A";
  return `$${cpc.toFixed(2)}`;
}

function getCompetitionLabel(competition: number | null): {
  label: string;
  variant: "success" | "warning" | "destructive";
} {
  if (competition === null) return { label: "N/A", variant: "warning" };
  if (competition <= 0.33) return { label: "Low", variant: "success" };
  if (competition <= 0.66) return { label: "Medium", variant: "warning" };
  return { label: "High", variant: "destructive" };
}

const COUNTRY_OPTIONS = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
];

export function KeywordResearchPanel({ onTrackKeyword }: Props) {
  const [seedKeyword, setSeedKeyword] = useState("");
  const [country, setCountry] = useState("IN");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KeywordData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleResearch = async () => {
    if (!seedKeyword.trim()) {
      toast.error("Enter a seed keyword");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/keyword-research/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedKeyword: seedKeyword.trim(), country }),
      });
      const data = (await res.json()) as {
        data?: { keywords: KeywordData[]; cached: boolean };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to fetch keywords");
        toast.error(data.error ?? "Failed to fetch keywords");
        return;
      }
      const keywords = data.data?.keywords ?? [];
      setResults(keywords);
      if (data.data?.cached) {
        toast.success(`Loaded ${keywords.length} keywords (cached)`);
      } else {
        toast.success(`Found ${keywords.length} keyword suggestions`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const rows = [["keyword", "volume", "cpc", "competition"]];
    for (const kw of results) {
      rows.push([
        `"${kw.keyword}"`,
        kw.searchVolume?.toString() ?? "",
        kw.cpc?.toFixed(2) ?? "",
        kw.competition?.toFixed(2) ?? "",
      ]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${seedKeyword}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Enter seed keyword e.g. content marketing"
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleResearch();
                }}
              />
            </div>
            <div className="w-full sm:w-44">
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void handleResearch()} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? "Fetching keyword data..." : "Research"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-lg border border-error/30 bg-error-light p-4 text-sm text-error">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              {results.length} keywords found for &quot;{seedKeyword}&quot;
            </p>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 pb-3 pt-4 text-left text-xs font-medium text-text-muted">
                      Keyword
                    </th>
                    <th className="px-4 pb-3 pt-4 text-right text-xs font-medium text-text-muted">
                      Volume
                    </th>
                    <th className="px-4 pb-3 pt-4 text-right text-xs font-medium text-text-muted">
                      CPC
                    </th>
                    <th className="px-4 pb-3 pt-4 text-center text-xs font-medium text-text-muted">
                      Competition
                    </th>
                    <th className="px-4 pb-3 pt-4 text-right text-xs font-medium text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((kw, i) => {
                    const comp = getCompetitionLabel(kw.competition);
                    return (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 hover:bg-surface-hover"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-text-primary">
                          {kw.keyword}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          {formatVolume(kw.searchVolume)}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          {formatCpc(kw.cpc)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={comp.variant}>{comp.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {onTrackKeyword ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onTrackKeyword(kw.keyword, "")}
                                className="h-7 gap-1 px-2 text-xs"
                              >
                                <ExternalLink className="h-3 w-3" /> Track
                              </Button>
                            ) : (
                              <Link
                                href={`/rank-tracker?keyword=${encodeURIComponent(kw.keyword)}`}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-xs"
                                >
                                  <ExternalLink className="h-3 w-3" /> Track
                                </Button>
                              </Link>
                            )}
                            <Link
                              href={`/briefs?keyword=${encodeURIComponent(kw.keyword)}`}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                              >
                                <FileText className="h-3 w-3" /> Brief
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !loading && !error && (
        <div className="rounded-xl border border-border bg-surface py-12 text-center">
          <Search className="mx-auto mb-3 h-10 w-10 text-text-muted opacity-50" />
          <p className="text-text-secondary">
            Enter a keyword to discover related search terms
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Powered by DataForSEO — results include search volume, CPC, and competition data
          </p>
        </div>
      )}
    </div>
  );
}
