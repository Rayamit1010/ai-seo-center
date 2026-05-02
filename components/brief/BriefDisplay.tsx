"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Tag } from "lucide-react";
import type { BriefOutput } from "@/lib/prompts/brief-generator";

interface Props {
  brief: BriefOutput;
  briefId: string;
  keyword: string;
}

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-500/20 text-blue-400",
  commercial: "bg-green-500/20 text-green-400",
  transactional: "bg-orange-500/20 text-orange-400",
  navigational: "bg-purple-500/20 text-purple-400",
};

export function BriefDisplay({ brief, briefId, keyword }: Props) {
  const [openSections, setOpenSections] = useState<number[]>([]);

  const toggleSection = (i: number) => {
    setOpenSections((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  };

  const copyMarkdown = async () => {
    const res = await fetch(`/api/brief/${briefId}/export?format=markdown`);
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    toast.success("Markdown copied!");
  };

  const downloadHtml = async () => {
    const res = await fetch(`/api/brief/${briefId}/export?format=html`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `brief-${keyword.slice(0, 30)}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(brief, null, 2));
    toast.success("JSON copied!");
  };

  const metaTitleLen = brief.metaTitle?.length ?? 0;
  const metaDescLen = brief.metaDescription?.length ?? 0;

  return (
    <div className="space-y-5 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-text-primary">{keyword}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${INTENT_COLORS[brief.searchIntent] ?? "bg-gray-500/20 text-gray-400"}`}>
          {brief.searchIntent}
        </span>
        <span className="text-xs text-text-muted">{brief.wordCount.toLocaleString()} words</span>
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <p className="mb-1 text-xs text-text-muted">H1 Suggestion</p>
        <p className="text-base font-semibold text-text-primary">{brief.h1Suggestion}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Meta Title</p>
            <span className={`text-xs ${metaTitleLen > 60 ? "text-red-400" : "text-text-muted"}`}>{metaTitleLen}/60</span>
          </div>
          <p className="mt-1 text-sm text-text-primary">{brief.metaTitle}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Meta Description</p>
            <span className={`text-xs ${metaDescLen > 160 ? "text-red-400" : "text-text-muted"}`}>{metaDescLen}/160</span>
          </div>
          <p className="mt-1 text-sm text-text-primary">{brief.metaDescription}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-text-primary">Content Outline</p>
        <div className="space-y-2">
          {brief.outline.map((section, i) => (
            <div key={i} className="rounded-lg border border-border bg-background overflow-hidden">
              <button
                onClick={() => toggleSection(i)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left"
              >
                <span className="text-sm font-medium text-text-primary">{section.h2}</span>
                <span className="text-xs text-text-muted">~{section.suggestedWordCount}w</span>
              </button>
              {openSections.includes(i) && (
                <div className="border-t border-border px-4 py-2.5">
                  <p className="text-sm text-text-secondary">{section.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
          <Tag className="h-4 w-4" /> LSI Keywords
        </p>
        <div className="flex flex-wrap gap-2">
          {brief.lsiKeywords.map((kw) => (
            <span key={kw} className="rounded-full bg-background px-3 py-1 text-xs text-text-secondary border border-border">{kw}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <button onClick={copyMarkdown} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover">
          <Copy className="h-3.5 w-3.5" /> Copy Markdown
        </button>
        <button onClick={downloadHtml} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover">
          <Download className="h-3.5 w-3.5" /> Download HTML
        </button>
        <button onClick={copyJson} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover">
          <Copy className="h-3.5 w-3.5" /> Copy JSON
        </button>
      </div>
    </div>
  );
}
