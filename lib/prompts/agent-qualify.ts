import { SYSTEM_PROMPT, appendProjectMemory } from "./system";

export function buildQualifyPrompt(input: {
  domain: string;
  scrapedData: string;
  industry: string;
  targetUrl: string;
  projectContext?: string;
}): { system: string; user: string } {
  const system = appendProjectMemory(`${SYSTEM_PROMPT}

You are an expert at evaluating website quality for link-building opportunities. You assess domains based on scraped homepage data and estimate their value as backlink sources.

Score criteria:
- Content quality and depth (professional writing, original content, regular updates)
- Technical signals (HTTPS, proper schema, fast loading, mobile-friendly)
- Niche relevance to the target industry
- Site structure (clear navigation, multiple pages, established presence)
- Outbound link quality (links to authoritative sources)
- Red flags: thin content, excessive ads, PBN indicators, expired domain signs, auto-generated text

You think like a senior SEO link builder. Prioritize editorial quality, topical fit, and low spam risk over raw volume.

Return your assessment as JSON.`, input.projectContext);

  const user = `Evaluate this domain as a potential backlink source:

Domain: ${input.domain}
Target industry: ${input.industry}
Our site: ${input.targetUrl}

Scraped homepage data:
${input.scrapedData}

Return JSON:
{
  "qualityScore": <0-100>,
  "qualityTier": "tier1" | "tier2" | "tier3" | "rejected",
  "relevanceScore": <0-10>,
  "spamRisk": <0-100 where higher means riskier>,
  "authorityScore": <0-100>,
  "topicalFit": <0-100>,
  "editorialQuality": <0-100>,
  "linkWorthiness": <0-100>,
  "outreachReadiness": "ready" | "needs_review" | "avoid",
  "reasoning": "<2-3 sentences explaining your assessment>",
  "positiveSignals": ["<specific quality strengths>"],
  "redFlags": ["<list any concerns>"],
  "recommendedAngle": "guest_post" | "niche_edit" | "resource_link" | "partnership"
}

Tier guide: tier1 = 80+, tier2 = 60-79, tier3 = 40-59, rejected = below 40.
Reject or mark avoid if the site looks spammy, irrelevant, auto-generated, or unlikely to place an editorially valuable backlink.`;

  return { system, user };
}
