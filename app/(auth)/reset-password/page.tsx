"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-text-secondary">Invalid reset link. Please request a new one.</p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm text-primary hover:underline">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) {
        toast.success("Password reset! Please sign in.");
        router.push("/login");
      } else {
        toast.error(json.error ?? "Reset failed");
      }
    } catch {
      toast.error("Something went wrong");
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
          <h1 className="text-xl font-bold text-text-primary">Set new password</h1>
          <p className="mt-1 text-sm text-text-secondary">Choose a strong password for your account.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-8 shadow-lg">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">New password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Min 12 chars, upper, lower, number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Confirm password</label>
              <input
                type={showPw ? "text" : "password"}
                required
                placeholder="Repeat your new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>
            <ul className="text-xs text-text-muted space-y-0.5">
              <li className={password.length >= 12 ? "text-success" : ""}>• At least 12 characters</li>
              <li className={/[A-Z]/.test(password) ? "text-success" : ""}>• One uppercase letter</li>
              <li className={/[a-z]/.test(password) ? "text-success" : ""}>• One lowercase letter</li>
              <li className={/[0-9]/.test(password) ? "text-success" : ""}>• One number</li>
            </ul>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Set new password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
