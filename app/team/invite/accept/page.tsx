"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";

type State = "loading" | "accepting" | "success" | "error" | "no-token";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<State>(token ? "loading" : "no-token");
  const [message, setMessage] = useState("");
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    if (!token) return;

    async function accept() {
      setState("accepting");
      try {
        const res = await fetch("/api/team/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { teamName?: string };
          error?: string;
        };

        if (json.success && json.data) {
          setTeamName(json.data.teamName ?? "your team");
          setState("success");
          setTimeout(() => router.push("/dashboard"), 2500);
        } else {
          setMessage(json.error ?? "Failed to accept invitation");
          setState("error");
        }
      } catch {
        setMessage("Something went wrong. Please try again.");
        setState("error");
      }
    }

    void accept();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Zap className="h-10 w-10 text-primary" />
        </div>

        {(state === "loading" || state === "accepting") && (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-text-secondary">Accepting your invitation…</p>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-success" />
            <h1 className="text-xl font-bold text-text-primary">You&apos;re in!</h1>
            <p className="text-text-secondary">
              You&apos;ve joined <strong>{teamName}</strong>. Redirecting to your dashboard…
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <XCircle className="mx-auto h-12 w-12 text-error" />
            <h1 className="text-xl font-bold text-text-primary">Invitation Error</h1>
            <p className="text-text-secondary">{message}</p>
            <div className="flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {state === "no-token" && (
          <div className="space-y-4">
            <XCircle className="mx-auto h-12 w-12 text-error" />
            <h1 className="text-xl font-bold text-text-primary">Invalid Link</h1>
            <p className="text-text-secondary">
              This invitation link is missing a token. Please use the link from your invite email.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  );
}
