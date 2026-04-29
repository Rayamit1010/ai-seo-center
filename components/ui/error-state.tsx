"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ErrorState({
  title = "Something needs attention",
  message,
  detail,
  onRetry,
}: {
  title?: string;
  message: string;
  detail?: string | null;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-warning/30 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(245,158,11,0.02))]">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <div className="rounded-xl bg-warning/10 p-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-text-primary">{title}</p>
              <p className="text-sm text-text-secondary">{message}</p>
              {detail ? <p className="text-xs text-text-muted">{detail}</p> : null}
            </div>
          </div>
          {onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
