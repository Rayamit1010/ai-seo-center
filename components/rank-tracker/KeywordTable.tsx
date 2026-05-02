"use client";

import { Loader2, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface TrackedKeywordRow {
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

interface KeywordTableProps {
  keywords: TrackedKeywordRow[];
  onDelete: (id: string) => void;
  onCheckNow: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  isChecking: string | null;
}

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null || change === 0) {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-surface text-text-muted border border-border">
        –
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-success/10 text-success border border-success/30">
        ↑{change}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-error/10 text-error border border-error/30">
      ↓{Math.abs(change)}
    </span>
  );
}

function sortKeywords(keywords: TrackedKeywordRow[]): TrackedKeywordRow[] {
  return [...keywords].sort((a, b) => {
    const aPos = a.currentPosition ?? Number.MAX_SAFE_INTEGER;
    const bPos = b.currentPosition ?? Number.MAX_SAFE_INTEGER;
    if (aPos !== bPos) return aPos - bPos;
    return a.keyword.localeCompare(b.keyword);
  });
}

export function KeywordTable({
  keywords,
  onDelete,
  onCheckNow,
  onSelect,
  selectedId,
  isChecking,
}: KeywordTableProps) {
  if (keywords.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
        <p className="text-sm text-text-secondary">
          No keywords tracked yet. Add your first keyword below.
        </p>
      </div>
    );
  }

  const sorted = sortKeywords(keywords);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">
              Keyword
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">
              Target URL
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">
              Position
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">
              Change
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">
              Device
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">
              Country
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wide">
              Last Checked
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((kw) => (
            <tr
              key={kw.id}
              className={`border-b border-border transition-colors hover:bg-surface-hover ${
                selectedId === kw.id ? "bg-primary/5" : ""
              } ${onSelect ? "cursor-pointer" : ""}`}
              onClick={onSelect ? () => onSelect(kw.id) : undefined}
            >
              <td className="px-4 py-3 font-medium text-text-primary">
                {kw.keyword}
              </td>
              <td className="px-4 py-3 max-w-[200px] truncate text-text-secondary font-mono text-xs">
                <a
                  href={kw.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {kw.targetDomain}
                </a>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono font-semibold text-text-primary">
                  {kw.currentPosition !== null ? `#${kw.currentPosition}` : "–"}
                </span>
              </td>
              <td className="px-4 py-3">
                <ChangeBadge change={kw.change} />
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="capitalize text-xs">
                  {kw.device}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="text-xs">
                  {kw.country}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-text-muted">
                {kw.lastCheckedAt ? formatDate(kw.lastCheckedAt) : "Never"}
              </td>
              <td className="px-4 py-3">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={isChecking === kw.id}
                    onClick={() => onCheckNow(kw.id)}
                    title="Check rank now"
                  >
                    {isChecking === kw.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-error hover:text-error hover:bg-error/10"
                    onClick={() => {
                      if (window.confirm(`Remove keyword "${kw.keyword}" from tracking?`)) {
                        onDelete(kw.id);
                      }
                    }}
                    title="Delete keyword"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
