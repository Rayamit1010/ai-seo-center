"use client";

import { useState } from "react";
import { Loader2, TrendingUp, ExternalLink, FileText } from "lucide-react";
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

interface GapResult {
  keyword: string;
  competitorPosition: number;
  estimatedVolume: number;
  opportunityScore: number;
}

function getScoreBadgeVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 8) return "success";
  if (score >= 5) return "warning";
  return "destructive";
}

const COUNTRY_OPTIONS = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
];

export function GapAnalysis() {
  const [yourDomain, setYourDomain] = useState("");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [country, setCountry] = useState("IN");
  const [loading, setLoading] = useState(false);
  const [gaps, setGaps] = useState<GapResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!yourDomain.trim() || !competitorDomain.trim()) {
      toast.error("Enter both your domain and competitor domain");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/keyword-research/gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yourDomain: yourDomain.trim(),
          competitorDomain: competitorDomain.trim(),
          country,
        }),
      });
      const data = (await res.json()) as {
        data?: { gaps: GapResult[] };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Gap analysis failed");
        toast.error(data.error ?? "Gap analysis failed");
        return;
      }
      const gapList = data.data?.gaps ?? [];
      setGaps(gapList);
      if (gapList.length === 0) {
        toast.info(
          "No keyword gaps found. DataForSEO API keys may not be configured."
        );
      } else {
        toast.success(`Found ${gapList.length} keyword opportunities`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const addAllHighOpportunity = () => {
    const highOpp = gaps.filter((g) => g.opportunityScore >= 7);
    toast.info(`${highOpp.length} high-opportunity keywords — add to tracker from each row`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Your Domain
              </label>
              <Input
                placeholder="yourdomain.com"
                value={yourDomain}
                onChange={(e) => setYourDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Competitor Domain
              </label>
              <Input
                placeholder="competitor.com"
                value={competitorDomain}
                onChange={(e) => setCompetitorDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Country
              </label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue />
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
            <div className="flex items-end">
              <Button
                onClick={() => void handleAnalyze()}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                {loading ? "Analyzing..." : "Analyze Gap"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg border border-error/30 bg-error-light p-4 text-sm text-error">
          {error}
        </div>
      )}

      {/* Results */}
      {gaps.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              {gaps.length} keyword gaps vs {competitorDomain}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={addAllHighOpportunity}
              className="gap-2"
            >
              Add all high-opportunity keywords
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
                      Competitor Pos
                    </th>
                    <th className="px-4 pb-3 pt-4 text-right text-xs font-medium text-text-muted">
                      Est. Volume
                    </th>
                    <th className="px-4 pb-3 pt-4 text-center text-xs font-medium text-text-muted">
                      Opportunity
                    </th>
                    <th className="px-4 pb-3 pt-4 text-right text-xs font-medium text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((gap, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0 hover:bg-surface-hover"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-primary">
                        {gap.keyword}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">
                        #{gap.competitorPosition}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">
                        {gap.estimatedVolume.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={getScoreBadgeVariant(gap.opportunityScore)}>
                          {gap.opportunityScore}/10
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/rank-tracker?keyword=${encodeURIComponent(gap.keyword)}`}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                            >
                              <ExternalLink className="h-3 w-3" /> Track
                            </Button>
                          </Link>
                          <Link
                            href={`/briefs?keyword=${encodeURIComponent(gap.keyword)}`}
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
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {gaps.length === 0 && !loading && !error && (
        <div className="rounded-xl border border-border bg-surface py-12 text-center">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 text-text-muted opacity-50" />
          <p className="text-text-secondary">
            Enter your domain and a competitor to find keyword gaps
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Discover keywords your competitors rank for that you don&apos;t
          </p>
        </div>
      )}
    </div>
  );
}
