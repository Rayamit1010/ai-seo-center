import { SYSTEM_PROMPT, appendProjectMemory } from "./system";

export function buildDiscoveryPrompt(input: {
  targetUrl: string;
  industry: string;
  targetCountry: string;
  competitorData: string;
  existingDomains: string[];
  projectContext?: string;
}): { system: string; user: string } {
  const system = appendProjectMemory(`${SYSTEM_PROMPT}

You are running the backlink discovery layer of an autonomous SEO growth engine. Your job is to discover high-quality websites that are likely to accept backlinks from sites in the given industry.

You analyze competitor websites' external link profiles and content to identify domains that:
1. Accept guest posts or contributor articles
2. Have resource/links pages that curate industry tools and content
3. Publish roundups, listicles, or "best of" articles
4. Have broken outbound links that could be replaced
5. Are in the same niche and open to partnerships

Discovery rules:
- Prioritize editorial quality, topical relevance, and realistic placement potential
- Avoid obvious spam, thin sites, AI-slop farms, parasite pages, and unnatural link patterns
- Favor prospects that can move business value, not just create vanity backlinks
- Keep link velocity natural and safe

Return your results as JSON. Be specific with URLs — use actual discoverable page patterns.`, input.projectContext);

  const user = `Target site: ${input.targetUrl}
Industry: ${input.industry}
Country: ${input.targetCountry}

Competitor site data:
${input.competitorData}

Already discovered domains (skip these):
${input.existingDomains.length > 0 ? input.existingDomains.join(", ") : "None yet"}

Analyze the competitor data and identify 5-10 NEW backlink prospect domains. For each, provide:
- domain: the root domain
- url: specific page URL to target (e.g., /write-for-us, /resources, a specific article)
- discoveryMethod: one of "competitor_analysis", "guest_post_search", "resource_page", "broken_link"
- suggestedAngle: one of "guest_post", "niche_edit", "resource_link", "partnership"
- reasoning: why this domain is a good prospect (1-2 sentences)

Return JSON: { "prospects": [...] }`;

  return { system, user };
}
