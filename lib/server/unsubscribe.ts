import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

/** Returns the user's unsubscribe token, creating one if absent. */
export async function getOrCreateUnsubscribeToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { unsubscribeToken: true },
  });

  if (user?.unsubscribeToken) return user.unsubscribeToken;

  const token = randomBytes(32).toString("hex");
  await prisma.user.update({ where: { id: userId }, data: { unsubscribeToken: token } });
  return token;
}

const APP_URL = process.env.NEXTAUTH_URL ?? "https://seoagent.techgeekstudio.com";

export function buildUnsubscribeLink(token: string): string {
  return `${APP_URL}/api/unsubscribe?token=${token}`;
}

export function unsubscribeFooter(token: string): string {
  const link = buildUnsubscribeLink(token);
  return `
    <p style="color:#4A5568;font-size:11px;text-align:center;margin:24px 0 0;">
      You received this because you have an active TechGeekStudio SEO subscription.<br>
      <a href="${link}" style="color:#718096;text-decoration:underline;">Unsubscribe from all emails</a>
    </p>`;
}
