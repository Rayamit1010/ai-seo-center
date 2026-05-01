"use client";

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
}

function MeterBar({ current, limit }: { current: number; limit: number }) {
  if (limit === -1) {
    return (
      <div className="h-2 w-full rounded-full bg-primary/20">
        <div className="h-2 rounded-full bg-primary" style={{ width: "100%" }} />
      </div>
    );
  }

  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const colorClass =
    pct >= 95 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="h-2 w-full rounded-full bg-border">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function UsageMeter({ label, current, limit, unit = "" }: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isCritical = !isUnlimited && pct >= 95;
  const isWarning = !isUnlimited && pct >= 80 && pct < 95;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span
          className={`font-mono font-medium ${
            isCritical
              ? "text-red-500"
              : isWarning
                ? "text-amber-500"
                : "text-text-primary"
          }`}
        >
          {isUnlimited ? "∞" : `${current.toLocaleString()} / ${limit.toLocaleString()}`}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <MeterBar current={current} limit={limit} />
      {isCritical && (
        <p className="text-xs text-red-500">Limit reached — upgrade to continue</p>
      )}
      {isWarning && (
        <p className="text-xs text-amber-500">Approaching limit — consider upgrading</p>
      )}
    </div>
  );
}
