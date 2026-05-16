"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, CheckCircle, XCircle, Mail } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "No verification token was found in the link.",
  invalid: "This verification link is invalid or has already been used.",
  expired: "This verification link has expired. Please request a new one.",
  failed: "Verification failed due to a server error. Please try again.",
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <Zap className="mx-auto mb-4 h-8 w-8 text-primary" />
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-success" />
          <h1 className="text-xl font-bold text-text-primary">Email verified!</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Your email has been verified. You now have full access to your account.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <Zap className="mx-auto mb-4 h-8 w-8 text-primary" />
          <XCircle className="mx-auto mb-4 h-12 w-12 text-error" />
          <h1 className="text-xl font-bold text-text-primary">Verification failed</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {ERROR_MESSAGES[error] ?? "An unexpected error occurred."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
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
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <Zap className="mx-auto mb-4 h-8 w-8 text-primary" />
        <Mail className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="text-xl font-bold text-text-primary">Verify your email</h1>
        <p className="mt-2 text-sm text-text-secondary">
          We sent a verification link to your email. Click the link to activate your account.
        </p>
        <p className="mt-4 text-xs text-text-muted">
          Didn&apos;t get it? Check your spam folder or sign in and resend from your account settings.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
