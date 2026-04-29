import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { expect, test as base, type Page } from "@playwright/test";
import { encryptSecret } from "../../lib/crypto";
import { prisma } from "../../lib/db";

type TestAccount = {
  userId: string;
  email: string;
  password: string;
};

const DEFAULT_PASSWORD = "BrowserPass123";

function uniqueEmail() {
  return `browser-test-${randomUUID()}@example.com`;
}

export const test = base.extend<{ testAccount: TestAccount }>({
  testAccount: async ({}, runFixture) => {
    const email = uniqueEmail();
    const password = DEFAULT_PASSWORD;
    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        name: "Browser Test User",
        company: "TechGeekStudio",
        website: "https://techgeekstudio.com",
      },
    });

    try {
      await runFixture({
        userId: user.id,
        email,
        password,
      });
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  },
});

export { expect };

export async function loginAs(page: Page, account: TestAccount) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').first().fill(account.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/dashboard");
}

export async function seedWebhookProject(userId: string, overrides: Partial<{
  name: string;
  websiteUrl: string;
  cmsPublishStatus: "draft" | "publish";
}> = {}) {
  const websiteUrl = overrides.websiteUrl || "https://browser-project.example";

  return prisma.projectProfile.create({
    data: {
      userId,
      name: overrides.name || "Browser Project",
      websiteUrl,
      domain: new URL(websiteUrl).hostname,
      industry: "Software",
      targetCountry: "Global",
      cmsProvider: "webhook",
      cmsWebhookUrl: "http://localhost:3000/api/dev/mock-cms",
      cmsAppPasswordEnc: encryptSecret("browser-test-secret"),
      cmsPublishStatus: overrides.cmsPublishStatus || "draft",
      searchConsoleSiteUrl: `sc-domain:${new URL(websiteUrl).hostname}`,
      ga4PropertyId: "123456789",
    },
  });
}

export async function seedCompletedAudit(userId: string, url = "https://reports-browser.example") {
  return prisma.audit.create({
    data: {
      userId,
      url,
      title: "Reports Browser Audit",
      status: "COMPLETE",
      inputType: "url",
      summary: "The site is in good shape overall but still has a few high-impact technical fixes left.",
      scores: JSON.stringify({
        overall: 78,
        onpage: 74,
        technical: 69,
        offpage: 80,
        keywords: 76,
      }),
      onPage: JSON.stringify({
        wins: ["Improved title coverage"],
      }),
      technical: JSON.stringify({
        wins: ["Schema coverage improved"],
        issues: ["Reduce render-blocking resources"],
        schema: { recommendations: [] },
        coreWebVitals: {
          lcp: { fix: "Compress hero assets" },
          cls: { fix: "Reserve image space" },
          fid: { fix: "Reduce third-party JS" },
        },
      }),
      offPage: JSON.stringify({
        backlinkStrategy: {
          priorityActions: ["Pitch two resource pages"],
          quickWins: [],
          authorityTactics: [],
        },
      }),
      keywords: JSON.stringify({
        primary: [{ keyword: "ai seo agency", intent: "commercial", priority: "high" }],
        competitorGaps: [],
        contentIdeas: [],
      }),
      checklist: JSON.stringify({
        critical: [{ action: "Fix LCP on the homepage", module: "technical", impact: "high", effort: "medium" }],
        high: [],
        medium: [],
      }),
    },
  });
}
