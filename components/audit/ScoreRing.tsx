"use client";

import { useEffect, useState } from "react";
import { getScoreColor, getScoreLabel } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  label: string;
  size?: number;
  animated?: boolean;
}

export function ScoreRing({ score, label, size = 80, animated = true }: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(animated ? 0 : score);

  const strokeWidth = size > 100 ? 8 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = getScoreColor(score);
  const grade = getScoreLabel(score);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score, animated]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          {/* Score circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: animated ? "stroke-dashoffset 0.8s ease" : "none",
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-bold"
            style={{ color, fontSize: size > 100 ? 24 : 16 }}
          >
            {animatedScore}
          </span>
          <span
            className="font-mono text-text-muted"
            style={{ fontSize: size > 100 ? 12 : 10 }}
          >
            {grade}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-text-secondary">{label}</span>
    </div>
  );
}
