import { SYSTEM_PROMPT } from "./system";

/** Build keyword research prompt */
export function buildKeywordPrompt(input: {
  seedKeyword: string;
  targetCountry: string;
  industry: string;
  targetAudience: string;
  competitorDomains?: string;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

You are performing keyword research. Return ONLY valid JSON — no markdown, no code blocks.

JSON structure:
{
  "primary": [
    { "keyword": "<kw>", "intent": "commercial|informational|transactional|navigational", "volume": "high|medium|low", "difficulty": "high|medium|low", "priority": "high|medium|low", "cpcRange": "<$X-$Y>" }
  ],
  "longTail": [
    { "keyword": "<kw>", "intent": "<intent>", "volume": "low|medium", "opportunity": "high|medium|low", "type": "question|comparison|location|how-to" }
  ],
  "lsi": ["<semantic keyword 1>", ...],
  "competitorGaps": ["<gap opportunity 1>", ...],
  "contentIdeas": [
    { "title": "<article title>", "targetKeyword": "<kw>", "wordCount": <number>, "priority": "high|medium|low", "contentType": "blog|guide|comparison|case-study|landing-page" }
  ],
  "topicCluster": {
    "pillar": "<pillar page topic>",
    "supporting": ["<supporting article 1>", "<supporting article 2>", ...]
  },
  "intentAnalysis": "<paragraph summary of search intent landscape>"
}

Provide exactly:
- 10 primary keywords
- 15 long-tail keywords (questions, comparisons, location-based)
- 10 LSI/semantic keywords
- 5 competitor gap opportunities
- 12 content ideas
- 1 topic cluster with pillar + 5 supporting articles`;

  const user = `Seed Keyword: ${input.seedKeyword}
Target Country: ${input.targetCountry}
Industry: ${input.industry}
Target Audience: ${input.targetAudience}
${input.competitorDomains ? `Competitor Domains: ${input.competitorDomains}` : ""}

Generate comprehensive keyword research for this seed keyword.`;

  return { system, user };
}
