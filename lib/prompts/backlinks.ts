import { SYSTEM_PROMPT } from "./system";

/** Build backlink strategy prompt */
export function buildBacklinkStrategyPrompt(input: {
  targetUrl: string;
  industry: string;
  targetCountry: string;
  currentDR: number;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

You are generating a white-hat backlink acquisition strategy. Return ONLY valid JSON.

JSON structure:
{
  "thirtyDayPlan": {
    "week1": ["<action1>", "<action2>"],
    "week2": ["<action1>", "<action2>"],
    "week3": ["<action1>", "<action2>"],
    "week4": ["<action1>", "<action2>"]
  },
  "monthlyTargets": {
    "guestPosts": <number>,
    "nicheEdits": <number>,
    "prMentions": <number>,
    "partnerships": <number>
  },
  "tactics": [
    { "tactic": "<name>", "description": "<how to execute>", "expectedLinks": "<range>", "difficulty": "easy|medium|hard", "timeframe": "<weeks>" }
  ],
  "competitorGaps": [
    { "opportunity": "<description>", "suggestedAction": "<action>", "priority": "high|medium|low" }
  ],
  "anchorTextDistribution": {
    "branded": "35-40%",
    "partialMatch": "20-25%",
    "exactMatch": "10-15%",
    "naked": "10-15%",
    "generic": "15-20%"
  },
  "spamRiskChecklist": ["<check1>", "<check2>", "<check3>", "<check4>", "<check5>"]
}

Provide 10 specific tactics, 5 competitor gap opportunities.`;

  const user = `Target URL: ${input.targetUrl}
Industry: ${input.industry}
Target Country: ${input.targetCountry}
Current Domain Rating (estimated): ${input.currentDR}

Generate a comprehensive white-hat backlink acquisition strategy.`;

  return { system, user };
}

/** Build domain qualifier prompt */
export function buildDomainQualifierPrompt(
  domains: string[],
  niche: string
): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

Evaluate each domain for link building quality. Return ONLY valid JSON.

JSON structure:
{
  "domains": [
    {
      "domain": "<domain>",
      "nicheRelevance": <1-10>,
      "qualityTier": "Tier 1|Tier 2|Tier 3",
      "recommendedAngle": "guest_post|niche_edit|resource|partnership",
      "redFlags": ["<flag1>"],
      "reasoning": "<brief explanation>",
      "priority": <1-N ranking>
    }
  ],
  "summary": "<overall assessment>"
}`;

  const user = `Niche: ${niche}

Evaluate these domains for link building potential:
${domains.map((d, i) => `${i + 1}. ${d}`).join("\n")}`;

  return { system, user };
}
