"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

type Quota = { current: number; limit: number; pct: number };
type QuotaStatus = {
  quotas: { aiCalls: Quota; projects: Quota; keywords: Quota };
  nudge: boolean;
};

const LABEL: Record<string, string> = {
  aiCalls: "AI calls today",
  projects: "projects",
  keywords: "keywords tracked",
};

export function QuotaNudgeBanner() {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/billing/quota-status")
      .then((r) => r.json())
      .then((d) => d.success && setStatus(d.data))
      .catch(() => {});
  }, []);

  if (!status?.nudge || dismissed) return null;

  const critical = Object.entries(status.quotas)
    .filter(([, q]) => q.pct >= 80 && q.limit !== -1)
    .map(([key, q]) => `${LABEL[key]} (${q.current}/${q.limit})`);

  return (
    <div className="relative flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="text-amber-200">
        You&apos;re near your plan limit for{" "}
        <span className="font-medium">{critical.join(" and ")}</span>.{" "}
        <Link href="/billing" className="font-semibold underline underline-offset-2 hover:text-amber-100">
          Upgrade to avoid disruptions →
        </Link>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto shrink-0 text-amber-400/60 hover:text-amber-300"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
