/** Weekly SEO digest email template */
export function buildDigestEmail(data: {
  userName: string;
  domain: string;
  scoreChange: number;
  currentScore: number;
  topActions: string[];
  dashboardUrl: string;
}): { subject: string; html: string } {
  const direction = data.scoreChange >= 0 ? "up" : "down";
  const emoji = data.scoreChange >= 0 ? "📈" : "📉";

  return {
    subject: `${emoji} Weekly SEO Digest for ${data.domain} — Score ${direction} ${Math.abs(data.scoreChange)} points`,
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
      <p style="color:#718096;font-size:14px;margin:4px 0 0;">Weekly Digest</p>
    </div>

    <div style="background:#0D1117;border:1px solid #1C2333;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#718096;font-size:14px;margin:0 0 8px;">Hi ${data.userName},</p>
      <p style="color:#E2E8F0;font-size:16px;margin:0 0 16px;">Here's your weekly SEO summary for <strong>${data.domain}</strong>:</p>

      <div style="text-align:center;padding:24px;background:#07090F;border-radius:8px;margin-bottom:16px;">
        <p style="color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Current SEO Score</p>
        <p style="color:${data.currentScore >= 80 ? "#00C896" : data.currentScore >= 60 ? "#F59E0B" : "#EF4444"};font-size:48px;font-weight:bold;margin:0;">${data.currentScore}</p>
        <p style="color:${data.scoreChange >= 0 ? "#00C896" : "#EF4444"};font-size:14px;margin:8px 0 0;">${direction === "up" ? "↑" : "↓"} ${Math.abs(data.scoreChange)} points from last week</p>
      </div>
    </div>

    <div style="background:#0D1117;border:1px solid #1C2333;border-radius:12px;padding:24px;margin-bottom:24px;">
      <h2 style="color:#E2E8F0;font-size:16px;margin:0 0 16px;">Top Priority Actions</h2>
      ${data.topActions.map((action, i) => `
        <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
          <span style="color:#0066CC;font-weight:bold;margin-right:12px;min-width:20px;">${i + 1}.</span>
          <span style="color:#E2E8F0;font-size:14px;">${action}</span>
        </div>
      `).join("")}
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <a href="${data.dashboardUrl}" style="display:inline-block;background:#0066CC;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">View Full Dashboard</a>
    </div>

    <p style="color:#4A5568;font-size:12px;text-align:center;margin:0;">
      Sent by TechGeekStudio SEO Command Center
    </p>
  </div>
</body>
</html>`,
  };
}
