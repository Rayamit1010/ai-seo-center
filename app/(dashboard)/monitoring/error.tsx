"use client";

export default function MonitoringError({ error, reset }: { error: Error; reset: () => void }) {
  const message =
    process.env.NODE_ENV === "development"
      ? error.message || "Something went wrong."
      : "Something went wrong. Please try again.";

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
      <p className="text-red-400">{message}</p>
      <button onClick={reset} className="mt-3 text-sm text-primary underline">Try again</button>
    </div>
  );
}
