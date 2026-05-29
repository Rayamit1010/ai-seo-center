"use client";

import Link from "next/link";
import { Zap, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          <span className="font-heading text-xl font-bold text-text-primary">TechGeekStudio</span>
        </div>
        <SearchX className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h1 className="text-4xl font-bold text-text-primary">404</h1>
        <p className="mt-2 text-lg font-medium text-text-secondary">Page not found</p>
        <p className="mt-2 text-sm text-text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border px-5 py-2.5 text-sm text-text-secondary hover:text-text-primary"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
