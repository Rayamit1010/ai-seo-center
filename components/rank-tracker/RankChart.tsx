"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface HistoryPoint {
  checkedAt: string;
  position: number | null;
}

interface RankChartProps {
  history: HistoryPoint[];
  keyword: string;
}

interface TooltipPayloadItem {
  value: number | null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0]?.value;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-semibold text-text-primary">
        {value !== null && value !== undefined ? `Position: #${value}` : "Not ranked"}
      </p>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function RankChart({ history, keyword }: RankChartProps) {
  if (history.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-border bg-surface">
        <p className="text-sm text-text-muted">No data yet for &quot;{keyword}&quot;</p>
      </div>
    );
  }

  const chartData = history.map((point) => ({
    date: formatDateLabel(point.checkedAt),
    position: point.position,
  }));

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-4 text-sm font-medium text-text-secondary">
        Rank history: <span className="text-text-primary font-semibold">{keyword}</span>
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-text-muted, #9ca3af)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[100, 1]}
            reversed={false}
            tick={{ fontSize: 11, fill: "var(--color-text-muted, #9ca3af)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `#${v}`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="position"
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ fill: "#6366F1", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "#6366F1" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
