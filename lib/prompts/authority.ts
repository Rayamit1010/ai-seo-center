import { SYSTEM_PROMPT } from "./system";

/** Build authority roadmap prompt */
export function buildAuthorityRoadmapPrompt(input: {
  currentDR: number;
  monthlyTraffic: number;
  revenueGoal: string;
  teamSize: number;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

Generate a 12-month authority building roadmap. Return ONLY valid JSON:
{
  "milestones": [
    {
      "quarter": "Q1|Q2|Q3|Q4",
      "drTarget": <number>,
      "referringDomains": <number>,
      "trafficTarget": <number>,
      "leadsTarget": <number>,
      "tactics": ["<tactic1>", "<tactic2>"],
      "resources": ["<resource1>", "<resource2>"]
    }
  ],
  "summary": "<overall strategy summary>"
}`;

  const user = `Current Domain Rating: ${input.currentDR}
Current Monthly Organic Traffic: ${input.monthlyTraffic}
12-Month Revenue Goal: ${input.revenueGoal}
Team Size: ${input.teamSize}

Generate the complete authority building roadmap.`;

  return { system, user };
}

/** Build digital PR campaign prompt */
export function buildPRCampaignPrompt(input: {
  industry: string;
  targetAudience: string;
  quarter: string;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

Generate digital PR campaign ideas. Return ONLY valid JSON:
{
  "campaigns": [
    {
      "title": "<campaign name>",
      "hook": "<newsworthy angle>",
      "assetType": "data-study|infographic|survey|tool|report",
      "journalistTargets": ["<publication1>", "<publication2>"],
      "expectedLinks": "<range>",
      "pressRelease": "<press release structure outline>",
      "distribution": ["<channel1>", "<channel2>"]
    }
  ]
}

Provide 3 campaign ideas.`;

  const user = `Industry: ${input.industry}
Target Audience: ${input.targetAudience}
Campaign Quarter: ${input.quarter}

Generate 3 digital PR campaign ideas.`;

  return { system, user };
}

/** Build founder brand builder prompt */
export function buildFounderBrandPrompt(input: {
  founderName: string;
  expertiseAreas: string;
  targetAudience: string;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

Generate a personal brand building strategy. Return ONLY valid JSON:
{
  "linkedInCalendar": [
    { "day": <1-30>, "topic": "<topic>", "hook": "<opening hook>", "format": "text|carousel|poll|video" }
  ],
  "twitterThreads": [
    { "topic": "<topic>", "hook": "<opening tweet>", "keyPoints": ["<point1>", "<point2>"] }
  ],
  "podcastPitches": [
    { "showType": "<category>", "pitchAngle": "<angle>", "talkingPoints": ["<point1>", "<point2>"] }
  ],
  "haroTemplates": [
    { "queryType": "<type>", "responseTemplate": "<template>" }
  ],
  "guestArticles": [
    { "publication": "<target pub>", "pitchTitle": "<title>", "angle": "<unique angle>" }
  ]
}

Provide: 30 LinkedIn posts, 10 Twitter threads, 5 podcast pitches, 5 HARO templates, 3 guest articles.`;

  const user = `Founder Name: ${input.founderName}
Expertise Areas: ${input.expertiseAreas}
Target Audience: ${input.targetAudience}

Generate the complete personal brand strategy.`;

  return { system, user };
}
