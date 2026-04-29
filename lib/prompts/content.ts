import { SYSTEM_PROMPT } from "./system";

/** Build content analysis prompt */
export function buildContentAnalysisPrompt(
  scrapedDataJson: string
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

Analyze the page content for on-page SEO optimization. Return ONLY valid JSON:
{
  "titleOptimizer": {
    "current": "<current title>",
    "alternatives": [
      { "title": "<suggested title>", "charCount": <number> },
      { "title": "<suggested title>", "charCount": <number> },
      { "title": "<suggested title>", "charCount": <number> }
    ]
  },
  "metaOptimizer": {
    "current": "<current meta description>",
    "alternatives": [
      { "description": "<suggested meta>", "charCount": <number> },
      { "description": "<suggested meta>", "charCount": <number> },
      { "description": "<suggested meta>", "charCount": <number> }
    ]
  },
  "headingStructure": {
    "hierarchy": [{ "level": <1-6>, "text": "<heading text>" }],
    "score": <0-100>,
    "issues": ["<issue1>"]
  },
  "contentScore": {
    "overall": <0-100>,
    "depth": <0-100>,
    "keywords": <0-100>,
    "readability": <0-100>,
    "structure": <0-100>
  },
  "lsiKeywords": [
    { "keyword": "<keyword>", "placement": "<where to add it>" }
  ],
  "internalLinkOpportunities": [
    { "page": "<suggested page>", "anchorText": "<anchor>", "reason": "<why>" }
  ],
  "eeatScore": {
    "score": <0-100>,
    "improvements": ["<improvement1>", "<improvement2>"]
  }
}`;

  const user = `PAGE DATA:
${scrapedDataJson}

Analyze this page's content for SEO optimization opportunities.`;

  return { system, user };
}

/** Build meta tag generator prompt */
export function buildMetaTagPrompt(input: {
  topic: string;
  targetKeyword: string;
  targetAudience: string;
  tone: string;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

Generate optimized meta tags. Return ONLY valid JSON:
{
  "titles": [
    { "text": "<title>", "charCount": <number>, "keywordPosition": "front|middle|end" }
  ],
  "descriptions": [
    { "text": "<description>", "charCount": <number> }
  ],
  "ogTitle": "<og:title>",
  "ogDescription": "<og:description>",
  "twitterTitle": "<twitter:title>",
  "twitterDescription": "<twitter:description>"
}

Provide 5 title variations and 5 meta description variations.
Titles should be 50-60 characters. Descriptions 120-155 characters.`;

  const user = `Page Topic: ${input.topic}
Target Keyword: ${input.targetKeyword}
Target Audience: ${input.targetAudience}
Tone: ${input.tone}

Generate optimized meta tags.`;

  return { system, user };
}

/** Build schema generator prompt */
export function buildSchemaPrompt(input: {
  pageType: string;
  details: Record<string, string>;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

Generate valid JSON-LD structured data markup. Return ONLY valid JSON:
{
  "type": "<schema type>",
  "jsonLd": "<complete JSON-LD script tag content>"
}

The jsonLd field should contain the full JSON-LD content ready to paste into a <script type="application/ld+json"> tag.`;

  const user = `Page Type: ${input.pageType}
Details: ${JSON.stringify(input.details)}

Generate the complete JSON-LD structured data.`;

  return { system, user };
}
