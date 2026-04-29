import { SYSTEM_PROMPT } from "./system";

/** Build the full audit prompt with scraped and PageSpeed data */
export function buildAuditPrompt(
  scrapedDataJson: string,
  pagespeedDataJson: string | null
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

You are performing a comprehensive SEO audit. Analyze ALL the real data provided below.
Return ONLY valid JSON — no markdown, no code blocks, no explanation text.

The JSON must exactly match this structure:
{
  "scores": {
    "overall": <0-100>,
    "onpage": <0-100>,
    "technical": <0-100>,
    "offpage": <0-100>,
    "keywords": <0-100>
  },
  "summary": "<2-sentence verdict referencing actual page data>",
  "onPage": {
    "titleTag": {
      "current": "<actual title>",
      "length": <number>,
      "status": "good|too_long|too_short|missing",
      "score": <0-100>,
      "recommendation": "<specific fix>"
    },
    "metaDescription": {
      "current": "<actual meta>",
      "length": <number>,
      "status": "good|too_long|too_short|missing",
      "score": <0-100>,
      "recommendation": "<specific fix>"
    },
    "headings": {
      "h1Count": <number>,
      "h1Text": ["<actual h1s>"],
      "status": "good|multiple_h1|missing_h1",
      "score": <0-100>,
      "recommendation": "<specific fix>"
    },
    "content": {
      "wordCount": <number>,
      "readabilityScore": <0-100>,
      "keywordDensity": "<analysis>",
      "contentGaps": ["<gap1>", "<gap2>", "<gap3>"],
      "lsiKeywordsMissing": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>"],
      "recommendation": "<specific fix>"
    },
    "images": {
      "total": <number>,
      "missingAlt": <number>,
      "score": <0-100>,
      "recommendation": "<specific fix>"
    },
    "internalLinking": {
      "totalLinks": <number>,
      "internalCount": <number>,
      "externalCount": <number>,
      "score": <0-100>,
      "opportunities": ["<opportunity1>", "<opportunity2>"]
    },
    "issues": ["<issue1>", "<issue2>", "<issue3>"],
    "wins": ["<win1>", "<win2>"]
  },
  "technical": {
    "coreWebVitals": {
      "lcp": { "value": "<actual>", "status": "good|needs_improvement|poor", "fix": "<fix>" },
      "fid": { "value": "<actual>", "status": "good|needs_improvement|poor", "fix": "<fix>" },
      "cls": { "value": "<actual>", "status": "good|needs_improvement|poor", "fix": "<fix>" },
      "performanceScore": { "mobile": <0-100>, "desktop": <0-100> }
    },
    "crawlability": {
      "hasCanonical": <bool>,
      "robotsMeta": "<value or null>",
      "hasHttps": <bool>,
      "htmlSize": "<KB>",
      "score": <0-100>,
      "issues": ["..."]
    },
    "schema": {
      "detected": ["<schema types found>"],
      "missing": ["<schema types to add>"],
      "priority": "high|medium|low",
      "recommendations": ["<rec1>", "<rec2>"]
    },
    "mobile": {
      "hasViewport": <bool>,
      "score": <0-100>,
      "issues": ["..."]
    },
    "issues": ["<critical issue 1>"],
    "wins": ["<win1>"]
  },
  "offPage": {
    "backlinkStrategy": {
      "priorityActions": ["<action1>", "<action2>", "<action3>"],
      "quickWins": ["<win1>", "<win2>"],
      "linkTargets": [
        { "type": "guest_post", "target": "<site type>", "dr": "<range>", "priority": "high" }
      ]
    },
    "digitalPR": {
      "angles": ["<PR angle 1>", "<PR angle 2>"],
      "targetPublications": ["<pub1>", "<pub2>", "<pub3>"]
    },
    "anchorTextStrategy": {
      "branded": "35-40%",
      "partialMatch": "20-25%",
      "exactMatch": "10-15%",
      "naked": "10-15%",
      "generic": "15-20%"
    },
    "authorityTactics": ["<tactic1>", "<tactic2>", "<tactic3>"]
  },
  "keywords": {
    "primary": [
      { "keyword": "<kw>", "intent": "commercial|informational|transactional", "volume": "high|medium|low", "difficulty": "high|medium|low", "priority": "high|medium|low" }
    ],
    "longTail": [{ "keyword": "<kw>", "intent": "informational", "volume": "low", "opportunity": "high|medium|low" }],
    "lsi": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>", "<kw6>"],
    "competitorGaps": ["<gap1>", "<gap2>", "<gap3>"],
    "contentIdeas": [
      { "title": "<article title>", "targetKeyword": "<kw>", "wordCount": <number>, "priority": "high|medium|low" }
    ]
  },
  "checklist": {
    "critical": [
      { "action": "<specific action>", "impact": "high", "effort": "low|medium|high", "module": "onpage|technical|offpage|keywords" }
    ],
    "high": [],
    "medium": [],
    "longTerm": []
  }
}`;

  const user = `REAL SCRAPED DATA FROM THE PAGE:
${scrapedDataJson}

${pagespeedDataJson ? `GOOGLE PAGESPEED DATA:\n${pagespeedDataJson}` : "No PageSpeed data available (HTML paste mode)."}

Perform a comprehensive SEO audit based on this real data. Return ONLY the JSON object.`;

  return { system, user };
}
