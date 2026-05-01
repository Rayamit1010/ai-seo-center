"use client";

interface PaymentRecord {
  id: string;
  gateway: string;
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  createdAt: string;
  receiptUrl?: string | null;
}

interface PaymentHistoryProps {
  payments: PaymentRecord[];
}

function formatAmount(amount: number, currency: string): string {
  const value = amount / 100;
  if (currency === "INR") return `₹${value.toLocaleString("en-IN")}`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    succeeded: "bg-green-500/10 text-green-500",
    failed: "bg-red-500/10 text-red-500",
    pending: "bg-amber-500/10 text-amber-500",
    refunded: "bg-blue-500/10 text-blue-500",
  };
  const cls = variants[status] ?? "bg-border text-text-secondary";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-text-secondary">No payments yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background">
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Date</th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Amount</th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Gateway</th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Method</th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-text-secondary">
                {new Date(p.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="px-4 py-3 font-mono font-medium">
                {formatAmount(p.amount, p.currency)}
              </td>
              <td className="px-4 py-3 capitalize text-text-secondary">{p.gateway}</td>
              <td className="px-4 py-3 capitalize text-text-secondary">
                {p.paymentMethod ?? "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-4 py-3">
                {p.receiptUrl ? (
                  <a
                    href={p.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-text-secondary">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
