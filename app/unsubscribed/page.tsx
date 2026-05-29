import Link from "next/link";
import { Zap, CheckCircle, AlertCircle } from "lucide-react";

export const metadata = { title: "Unsubscribed | TechGeekStudio SEO", robots: { index: false } };

export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success } = await searchParams;
  const isSuccess = success === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-heading text-lg font-bold text-text-primary">TechGeekStudio SEO</span>
        </div>

        {isSuccess ? (
          <>
            <CheckCircle className="mx-auto mb-4 h-14 w-14 text-emerald-400" />
            <h1 className="text-2xl font-bold text-text-primary">Unsubscribed</h1>
            <p className="mt-2 text-sm text-text-muted">
              You&apos;ve been removed from all marketing emails. Transactional emails (billing
              receipts, password resets) will still be delivered.
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="mx-auto mb-4 h-14 w-14 text-amber-400" />
            <h1 className="text-2xl font-bold text-text-primary">Link invalid</h1>
            <p className="mt-2 text-sm text-text-muted">
              This unsubscribe link is expired or has already been used.
            </p>
          </>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-border px-5 py-2.5 text-sm text-text-secondary hover:text-text-primary"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
