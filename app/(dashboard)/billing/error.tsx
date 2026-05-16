"use client";

export default function SectionError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
      <p className="text-red-400">{error.message || "Something went wrong."}</p>
      <button onClick={reset} className="mt-3 text-sm text-primary underline">
        Try again
      </button>
    </div>
  );
}
