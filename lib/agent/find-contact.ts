import { prisma } from "@/lib/db";
import { scrapeUrl } from "@/lib/scraper";
import { callClaudeJSON } from "@/lib/anthropic";
import { buildContactGuessPrompt } from "@/lib/prompts/agent-contact";
import { BATCH_SIZES, CONTACT_PAGES, EMAIL_REGEX } from "./constants";
import type { AgentLogEntry, ContactScrapeResult } from "./types";

export async function processFindContacts(
  userId: string,
  campaignId: string | undefined,
  log: AgentLogEntry[]
): Promise<void> {
  const prospects = await prisma.backlinkProspect.findMany({
    where: {
      userId,
      stage: "qualified",
      ...(campaignId ? { campaignId } : {}),
    },
    take: BATCH_SIZES.findContact,
    orderBy: { qualityScore: "desc" },
  });

  for (const prospect of prospects) {
    const startTime = Date.now();

    await prisma.backlinkProspect.update({
      where: { id: prospect.id },
      data: { stage: "finding_contact" },
    });

    try {
      const baseUrl = prospect.url.startsWith("http")
        ? new URL(prospect.url).origin
        : `https://${prospect.domain}`;

      const foundEmails: ContactScrapeResult["emails"] = [];
      const pagesScraped: string[] = [];
      const foundNames: string[] = [];

      // Scrape contact-related pages
      for (const page of CONTACT_PAGES) {
        try {
          const pageUrl = `${baseUrl}${page}`;
          const scraped = await scrapeUrl(pageUrl);
          pagesScraped.push(pageUrl);

          // Extract emails from visible text and HTML
          const textEmails = scraped.visibleText.match(EMAIL_REGEX) || [];
          for (const email of textEmails) {
            if (!foundEmails.some((e) => e.email === email)) {
              foundEmails.push({
                email,
                source: page,
                confidence: "high",
              });
            }
          }

          // Extract names from headings (potential contacts)
          for (const heading of [...scraped.h1, ...scraped.h2]) {
            const nameMatch = heading.match(
              /^(?:meet|about|by|written by|author:?)\s+(.+)/i
            );
            if (nameMatch) {
              foundNames.push(nameMatch[1].trim());
            }
          }
        } catch {
          // Page doesn't exist, skip
        }
      }

      let bestEmail = foundEmails[0]?.email || null;
      let bestName = foundNames[0] || null;
      let contactMethod = foundEmails.length > 0 ? "scraped_contact" : null;

      // If no emails found via scraping, ask AI to guess
      if (!bestEmail) {
        try {
          const pagesContent = pagesScraped.length > 0
            ? `Scraped ${pagesScraped.length} pages but found no emails.`
            : "Could not scrape any contact pages.";

          const { system, user } = buildContactGuessPrompt({
            domain: prospect.domain,
            scrapedPages: pagesContent,
            foundNames,
          });

          const guessResult = await callClaudeJSON<{
            bestEmail: string;
            bestName: string;
            role: string;
            confidence: string;
            reasoning: string;
            alternativeEmails: string[];
          }>(system, user, 1024, { userId, task: "agent-find-contact" });

          bestEmail = guessResult.bestEmail;
          bestName = guessResult.bestName;
          contactMethod = "pattern_guess";

          foundEmails.push({
            email: guessResult.bestEmail,
            name: guessResult.bestName,
            role: guessResult.role,
            source: "ai_guess",
            confidence: guessResult.confidence as "high" | "medium" | "low",
          });

          for (const alt of guessResult.alternativeEmails || []) {
            foundEmails.push({
              email: alt,
              source: "ai_guess_alt",
              confidence: "low",
            });
          }
        } catch {
          // AI guess failed
        }
      }

      if (bestEmail) {
        await prisma.backlinkProspect.update({
          where: { id: prospect.id },
          data: {
            contactEmail: bestEmail,
            contactName: bestName || "Editor",
            contactMethod,
            contactData: JSON.stringify({ emails: foundEmails, pagesScraped }),
            stage: "contact_found",
          },
        });

        log.push({
          timestamp: new Date().toISOString(),
          stage: "find_contact",
          action: `Found contact for ${prospect.domain}: ${bestEmail}`,
          prospectDomain: prospect.domain,
          success: true,
          durationMs: Date.now() - startTime,
        });
      } else {
        await prisma.backlinkProspect.update({
          where: { id: prospect.id },
          data: {
            stage: "failed",
            stageError: "No contact email found",
            contactData: JSON.stringify({ emails: [], pagesScraped }),
          },
        });

        log.push({
          timestamp: new Date().toISOString(),
          stage: "find_contact",
          action: `No contact found for ${prospect.domain}`,
          prospectDomain: prospect.domain,
          success: false,
          detail: "Scraped pages and AI guess both failed",
          durationMs: Date.now() - startTime,
        });
      }
    } catch (error) {
      await prisma.backlinkProspect.update({
        where: { id: prospect.id },
        data: {
          stage: "failed",
          stageError: `Contact search failed: ${error instanceof Error ? error.message : "Unknown"}`,
        },
      });

      log.push({
        timestamp: new Date().toISOString(),
        stage: "find_contact",
        action: `Contact search error for ${prospect.domain}`,
        prospectDomain: prospect.domain,
        success: false,
        detail: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      });
    }
  }
}
