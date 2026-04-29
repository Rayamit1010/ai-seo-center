import { SYSTEM_PROMPT } from "./system";

/** Build technical SEO analysis prompt */
export function buildTechnicalPrompt(
  scrapedDataJson: string,
  pagespeedDataJson: string | null
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

Perform a deep technical SEO analysis. Return ONLY valid JSON:
{
  "coreWebVitals": {
    "lcp": { "value": "<actual>", "status": "good|needs_improvement|poor", "fix": "<specific fix>" },
    "cls": { "value": "<actual>", "status": "good|needs_improvement|poor", "fix": "<specific fix>" },
    "fid": { "value": "<actual>", "status": "good|needs_improvement|poor", "fix": "<specific fix>" },
    "score": <0-100>
  },
  "crawlability": {
    "score": <0-100>,
    "issues": ["<issue1>"],
    "recommendations": ["<rec1>"]
  },
  "schema": {
    "detected": ["<type1>"],
    "missing": ["<type1>"],
    "score": <0-100>,
    "recommendations": ["<rec1>"]
  },
  "pageSpeed": {
    "mobileScore": <0-100>,
    "desktopScore": <0-100>,
    "opportunities": ["<opportunity1>"]
  },
  "mobile": {
    "score": <0-100>,
    "issues": ["<issue1>"]
  },
  "security": {
    "hasHttps": <bool>,
    "score": <0-100>,
    "issues": ["<issue1>"]
  },
  "htmlQuality": {
    "score": <0-100>,
    "issues": ["<issue1>"]
  },
  "internationalSeo": {
    "score": <0-100>,
    "issues": ["<issue1>"],
    "recommendations": ["<rec1>"]
  }
}`;

  const user = `SCRAPED DATA:
${scrapedDataJson}

${pagespeedDataJson ? `PAGESPEED DATA:\n${pagespeedDataJson}` : "No PageSpeed data available."}

Perform a deep technical SEO analysis.`;

  return { system, user };
}
