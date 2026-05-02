export const BRIEF_SYSTEM_PROMPT = `You are an expert SEO content strategist with deep knowledge of search intent analysis, SERP features, and content optimization. Your task is to create a comprehensive content brief for a given keyword.

Analyze the keyword, search intent, and top-ranking competitor content to produce a detailed, actionable content brief.

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanation text, just the raw JSON object.`;

export interface BriefOutlineSection {
  h2: string;
  description: string;
  suggestedWordCount: number;
}

export interface BriefOutput {
  searchIntent: "informational" | "commercial" | "transactional" | "navigational";
  wordCount: number;
  h1Suggestion: string;
  outline: BriefOutlineSection[];
  lsiKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  contentGoal: string;
  targetAudience: string;
  internalLinks: string[];
}

/**
 * Constructs the user prompt for brief generation with SERP and context data.
 */
export function buildBriefPrompt(
  keyword: string,
  country: string,
  serpData: string,
  projectContext: string
): string {
  return `Generate a comprehensive SEO content brief for the following keyword:

**Target Keyword:** ${keyword}
**Target Country:** ${country}

**Top SERP Results (competitors):**
${serpData || "No SERP data available — use your knowledge of typical search results for this keyword."}

${projectContext ? `**Brand Context:**\n${projectContext}\n` : ""}

Create a detailed content brief as a JSON object with this exact structure:
{
  "searchIntent": "informational" | "commercial" | "transactional" | "navigational",
  "wordCount": number (recommended total word count, 800-5000),
  "h1Suggestion": "string (compelling H1 tag, 40-60 chars)",
  "outline": [
    {
      "h2": "Section heading",
      "description": "What this section should cover and why",
      "suggestedWordCount": number
    }
  ],
  "lsiKeywords": ["related keyword 1", "related keyword 2", ...],
  "metaTitle": "string (max 60 characters)",
  "metaDescription": "string (max 160 characters)",
  "contentGoal": "string (what the content should achieve)",
  "targetAudience": "string (who this is written for)",
  "internalLinks": ["topic 1 to link to", "topic 2 to link to"]
}

Include 5-8 outline sections, 10-15 LSI keywords, and 3-5 internal link opportunities.
Respond with ONLY the JSON object, no other text.`;
}
