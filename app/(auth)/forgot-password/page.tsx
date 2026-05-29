"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show success to prevent email enumeration
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <span className="font-heading text-2xl font-bold text-text-primary">TechGeekStudio</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary">Reset your password</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-8 shadow-lg">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="font-semibold text-text-primary">Check your inbox</h2>
              <p className="text-sm text-text-secondary">
                If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <div className="text-center">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
