/** Subscription expiry warning email (7-day advance notice). */
export function buildSubscriptionExpiryEmail(data: {
  userName: string;
  planName: string;
  expiresAt: Date;
  renewUrl: string;
}): { subject: string; html: string } {
  const expiryFormatted = data.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    subject: `Your ${data.planName} plan expires in 7 days`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#07090F;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#E2E8F0;font-size:24px;margin:0;">TechGeekStudio SEO</h1>
    </div>

    <div style="background:#0D1117;border:1px solid #F59E0B;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#F59E0B;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Subscription Notice</p>
      <p style="color:#E2E8F0;font-size:16px;margin:0 0 12px;">Hi ${data.userName},</p>
      <p style="color:#A0AEC0;font-size:14px;margin:0;">Your <strong style="color:#E2E8F0;">${data.planName}</strong> plan expires on <strong style="color:#E2E8F0;">${expiryFormatted}</strong>. Renew now to keep your SEO data, tracked keywords, and scheduled reports uninterrupted.</p>
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <a href="${data.renewUrl}" style="display:inline-block;background:#0066CC;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Renew My Plan</a>
    </div>

    <p style="color:#4A5568;font-size:12px;text-align:center;">
      If you've already renewed, please disregard this message.
    </p>
  </div>
</body>
</html>`,
  };
}

/** Dead-letter job alert email for the admin. */
export function buildDeadLetterAlertEmail(data: {
  deadLetterCount: number;
  jobs: Array<{ jobName: string; lastError: string | null; attempts: number }>;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const rows = data.jobs
    .map(
      (j) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1C2333;color:#E2E8F0;font-size:13px;">${j.jobName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1C2333;color:#718096;font-size:12px;font-family:monospace;">${j.lastError ?? "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1C2333;color:#EF4444;font-size:13px;text-align:center;">${j.attempts}</td>
      </tr>`
    )
    .join("");

  return {
    subject: `⚠ ${data.deadLetterCount} background job(s) failed permanently`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#07090F;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    <h2 style="color:#EF4444;font-size:20px;margin:0 0 16px;">Dead-Letter Job Alert</h2>
    <p style="color:#A0AEC0;font-size:14px;margin:0 0 24px;">${data.deadLetterCount} job(s) moved to dead-letter in the last worker pass after exhausting all retries.</p>

    <table style="width:100%;border-collapse:collapse;background:#0D1117;border:1px solid #1C2333;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#161B27;">
          <th style="padding:10px 12px;text-align:left;color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;">Job</th>
          <th style="padding:10px 12px;text-align:left;color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;">Last Error</th>
          <th style="padding:10px 12px;text-align:center;color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;">Attempts</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:24px;text-align:center;">
      <a href="${data.dashboardUrl}/ops" style="display:inline-block;background:#0066CC;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">View Ops Dashboard</a>
    </div>
  </div>
</body>
</html>`,
  };
}
