import * as cheerio from "cheerio";
import { prisma } from "@/lib/db";
import { assertSafeScrapeTarget, safeFetch, assertHtmlResponse } from "@/lib/scraper";
import { normalizeUrl, isValidUrl } from "@/lib/utils";
import { getResendClient } from "@/lib/resend";

const RECHECK_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const ALERT_THROTTLE_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_CONCURRENCY = 5;
const MAX_HTML_BYTES = 3_000_000;

type Biz = { name: string; phone: string | null; city: string | null };

export type NapMatch = { nameMatch: boolean; phoneMatch: boolean | null; addressMatch: boolean | null; status: string };

/**
 * Pure NAP-matching logic over already-extracted page text. Kept separate from
 * the network fetch so it can be unit-tested in isolation.
 *
 * - name: case-insensitive substring match
 * - phone: compares the last 7 significant digits to tolerate formatting and
 *   country-code differences across directories
 * - city: case-insensitive substring match (proxy for address presence)
 */
export function matchNapInText(bodyText: string, biz: Biz): NapMatch {
  const lowerText = bodyText.toLowerCase();
  const nameMatch = lowerText.includes(biz.name.toLowerCase());

  let phoneMatch: boolean | null = null;
  if (biz.phone) {
    const phoneDigits = biz.phone.replace(/\D/g, "");
    if (phoneDigits.length >= 7) {
      const textDigits = bodyText.replace(/\D/g, "");
      phoneMatch = textDigits.includes(phoneDigits.slice(-7));
    }
  }

  let addressMatch: boolean | null = null;
  if (biz.city) {
    addressMatch = lowerText.includes(biz.city.toLowerCase());
  }

  return {
    nameMatch,
    phoneMatch,
    addressMatch,
    status: nameMatch ? "verified" : "inconsistent",
  };
}

async function verifyNapAtUrl(
  citationUrl: string,
  biz: Biz
): Promise<{ reachable: boolean } & NapMatch> {
  const unreachable = { reachable: false, nameMatch: false, phoneMatch: null, addressMatch: null, status: "unreachable" };

  try {
    const url = normalizeUrl(citationUrl);
    if (!isValidUrl(url)) return unreachable;
    assertSafeScrapeTarget(url);

    const response = await safeFetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TechGeekStudioBot/1.0; +https://techgeekstudio.com)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    assertHtmlResponse(response);

    const html = await response.text();
    if (Buffer.byteLength(html, "utf-8") > MAX_HTML_BYTES) return unreachable;

    const $ = cheerio.load(html);
    $("script, style").remove();
    const bodyText = $("body").text();

    return { reachable: true, ...matchNapInText(bodyText, biz) };
  } catch {
    return unreachable;
  }
}

async function applyNapCheck(citationId: string, citationUrl: string, biz: Biz) {
  const result = await verifyNapAtUrl(citationUrl, biz);

  const updated = await prisma.citation.update({
    where: { id: citationId },
    data: {
      status: result.status,
      nameMatch: result.nameMatch,
      phoneMatch: result.phoneMatch,
      addressMatch: result.addressMatch,
      lastCheckedAt: new Date(),
    },
  });

  return { citation: updated, result };
}

export async function getBusiness(userId: string) {
  return prisma.citationBusiness.findUnique({ where: { userId } });
}

export async function upsertBusiness(
  userId: string,
  data: {
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    phone?: string | null;
    website?: string | null;
    niche?: string | null;
  }
) {
  return prisma.citationBusiness.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function listCitations(userId: string) {
  const business = await prisma.citationBusiness.findUnique({
    where: { userId },
    include: { citations: { orderBy: { createdAt: "desc" } } },
  });

  if (!business) return { business: null, citations: [], summary: null };

  const { citations } = business;
  const summary = {
    total: citations.length,
    verified: citations.filter((c) => c.status === "verified").length,
    inconsistent: citations.filter((c) => c.status === "inconsistent").length,
    unreachable: citations.filter((c) => c.status === "unreachable").length,
    unchecked: citations.filter((c) => !c.status).length,
  };

  return { business, citations, summary };
}

export async function addCitation(
  userId: string,
  data: { directoryName: string; directoryUrl: string; citationUrl?: string }
) {
  const business = await prisma.citationBusiness.findUnique({ where: { userId } });
  if (!business) throw new Error("Set up your business profile first");

  return prisma.citation.create({ data: { userId, businessId: business.id, ...data } });
}

export async function removeCitation(userId: string, id: string) {
  return prisma.citation.deleteMany({ where: { id, userId } });
}

export async function recheckCitation(userId: string, id: string) {
  const citation = await prisma.citation.findFirst({
    where: { id, userId },
    include: { business: true },
  });
  if (!citation?.citationUrl) return null;

  return applyNapCheck(citation.id, citation.citationUrl, citation.business);
}

export async function runCitationChecks(limit = 50) {
  const cutoff = new Date(Date.now() - RECHECK_INTERVAL_MS);
  const due = await prisma.citation.findMany({
    where: {
      citationUrl: { not: null },
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: cutoff } }],
    },
    take: limit,
    include: { business: true },
  });

  let checked = 0;
  const degradedByUser = new Map<string, Array<{ directoryName: string }>>();

  for (let i = 0; i < due.length; i += CHECK_CONCURRENCY) {
    const batch = due.slice(i, i + CHECK_CONCURRENCY);
    await Promise.all(
      batch.map(async (citation) => {
        if (!citation.citationUrl) return;
        try {
          const prevStatus = citation.status;
          const { citation: updated } = await applyNapCheck(
            citation.id,
            citation.citationUrl,
            citation.business
          );
          checked++;

          const becameInconsistent = prevStatus === "verified" && updated.status !== "verified";
          const sevenDaysAgo = new Date(Date.now() - ALERT_THROTTLE_MS);
          const alertEligible = !citation.lastAlertAt || citation.lastAlertAt < sevenDaysAgo;

          if (becameInconsistent && alertEligible) {
            const list = degradedByUser.get(citation.userId) ?? [];
            list.push({ directoryName: citation.directoryName });
            degradedByUser.set(citation.userId, list);
          }
        } catch (err) {
          console.error(`Citation check failed for ${citation.id}:`, err);
        }
      })
    );
  }

  for (const [userId, changed] of degradedByUser) {
    await sendCitationAlert(userId, changed);
  }

  return { checked, alerted: degradedByUser.size };
}

async function sendCitationAlert(userId: string, changed: Array<{ directoryName: string }>) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return;

  try {
    const resend = getResendClient();
    const rows = changed.map((c) => `<li><strong>${c.directoryName}</strong></li>`).join("");
    const count = changed.length;

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "alerts@ai-seo-center.com",
      to: user.email,
      subject: `Citation Alert: ${count} listing${count > 1 ? "s" : ""} may have changed`,
      html: `<h2>Citation Monitor Alert</h2>
<p>Hi ${user.name ?? "there"},</p>
<p>The following citation${count > 1 ? "s" : ""} no longer appear${count === 1 ? "s" : ""} to contain your business name:</p>
<ul>${rows}</ul>
<p>Log in to re-verify these listings and update any inconsistent NAP data.</p>`,
    });

    await prisma.citation.updateMany({
      where: {
        userId,
        directoryName: { in: changed.map((c) => c.directoryName) },
        status: { in: ["inconsistent", "unreachable"] },
      },
      data: { lastAlertAt: new Date() },
    });
  } catch (err) {
    console.error("Failed to send citation alert:", err);
  }
}
