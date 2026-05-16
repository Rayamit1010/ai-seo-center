"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Zap, AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-background font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="mb-6 flex items-center justify-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-text-primary">TechGeekStudio</span>
            </div>
            <AlertTriangle className="mx-auto mb-4 h-14 w-14 text-warning" />
            <h1 className="text-2xl font-bold text-text-primary">Something went wrong</h1>
            <p className="mt-2 text-sm text-text-muted">
              An unexpected error occurred. Our team has been notified.
              {error.digest && (
                <span className="mt-1 block font-mono text-xs">Ref: {error.digest}</span>
              )}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={reset}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
              >
                Try again
              </button>
              <Link
                href="/dashboard"
                className="rounded-lg border border-border px-5 py-2.5 text-sm text-text-secondary hover:text-text-primary"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
