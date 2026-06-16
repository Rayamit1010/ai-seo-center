import { SYSTEM_PROMPT } from "./system";

export function buildCompetitorAnalysisPrompt(params: {
  competitorDomain: string;
  userWebsite?: string;
  userNiche?: string;
  trackedKeywords: string[];
}) {
  const { competitorDomain, userWebsite, userNiche, trackedKeywords } = params;
  const kwList = trackedKeywords.slice(0, 30).join(", ") || "none provided";

  return {
    system:
      SYSTEM_PROMPT +
      "\n\nYou are an expert SEO competitive intelligence analyst. Return ONLY a raw JSON object — no markdown, no commentary, no code fences.",
    user: `Analyze ${competitorDomain} as a competitor${userWebsite ? ` of ${userWebsite}` : ""}${userNiche ? ` in the ${userNiche} space` : ""}.

User's currently tracked keywords: ${kwList}

Return a JSON object with EXACTLY these fields:
{
  "summary": "2-3 sentence competitive overview",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "contentGaps": [{ "topic": "string", "rationale": "string" }],
  "keywordOpportunities": [{ "keyword": "string", "intent": "informational|commercial|transactional", "opportunity": "string" }],
  "backlinkGaps": ["domain or source type"],
  "quickWins": ["specific immediately actionable tactic"]
}

Provide 3-5 items per array. Base analysis on publicly known characteristics of the domain.`,
  };
}

export function buildGrowthOpportunitiesPrompt(params: {
  userWebsite?: string;
  userNiche?: string;
  competitors: string[];
  topKeywords: string[];
  rankSummary: { improved: number; declined: number; top10: number };
  backlinkCount: number;
}) {
  const { userWebsite, userNiche, competitors, topKeywords, rankSummary, backlinkCount } = params;

  return {
    system:
      SYSTEM_PROMPT +
      "\n\nYou are an expert SEO growth strategist. Return ONLY a raw JSON object — no markdown, no commentary, no code fences.",
    user: `Generate a strategic SEO growth plan for${userWebsite ? ` ${userWebsite}` : " this website"}${userNiche ? ` (${userNiche})` : ""}.

Current data:
- Competitors tracked: ${competitors.join(", ") || "none yet"}
- Keywords tracked: ${topKeywords.slice(0, 15).join(", ") || "none yet"}
- Keywords improved this period: ${rankSummary.improved}
- Keywords declined: ${rankSummary.declined}
- Keywords in top 10: ${rankSummary.top10}
- Acquired backlinks: ${backlinkCount}

Return a JSON object with EXACTLY these fields:
{
  "overallScore": 42,
  "momentumLabel": "Building Momentum",
  "priorityActions": [
    { "action": "string", "impact": "high|medium|low", "effort": "high|medium|low", "category": "content|technical|backlinks|keywords" }
  ],
  "contentStrategy": ["string"],
  "technicalFixes": ["string"],
  "linkBuildingFocus": ["string"],
  "quarterlyGoals": [
    { "goal": "string", "metric": "string", "target": "string" }
  ]
}

Provide 5-7 priorityActions, 4-5 contentStrategy items, 3-4 technicalFixes, 3-4 linkBuildingFocus, and exactly 3 quarterlyGoals.`,
  };
}
