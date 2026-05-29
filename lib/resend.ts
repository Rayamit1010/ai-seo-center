import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient(apiKey?: string): Resend {
  const key = apiKey || process.env.RESEND_API_KEY;
  if (!key) throw new Error("Resend API key not configured");

  if (!resendClient || apiKey) {
    resendClient = new Resend(key);
  }
  return resendClient;
}

export async function sendOutreachEmail(params: {
  apiKey?: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<{ id: string }> {
  const resend = getResendClient(params.apiKey);

  const html = buildOutreachHtml(params.body);

  const { data, error } = await resend.emails.send({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html,
    replyTo: params.replyTo,
  });

  if (error) throw new Error(error.message);
  return { id: data!.id };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal HTML wrapper — outreach emails should look personal, not templated */
function buildOutreachHtml(body: string): string {
  const paragraphs = body
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `<p style="margin:0 0 10px;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;">
${paragraphs}
</body>
</html>`;
}
