import { SYSTEM_PROMPT } from "./system";

/** Build outreach email generation prompt */
export function buildOutreachPrompt(input: {
  targetSiteData: string;
  angle: string;
  contentAngle: string;
  agencyInfo: { name: string; website: string; description: string };
  targetName: string;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

You are an expert white-hat link building outreach specialist.
Generate a hyper-personalized outreach email sequence.

Rules:
- Personalized opener MUST reference something SPECIFIC from their recent content
- NEVER start with "I" or "We"
- NEVER use generic openers like "Your site is amazing"
- Initial email: MAX 120 words
- One clear CTA only
- Natural, human tone — not salesy
- Follow-ups: shorter each time
- Breakup email: "Should I close your file?" approach

Return ONLY valid JSON:
{
  "subject": "<subject line>",
  "subjectAlt": "<A/B test alternative subject>",
  "body": "<full initial email body>",
  "followUp1": "<Day 4 follow-up email>",
  "followUp2": "<Day 11 follow-up email>",
  "breakup": "<Day 21 breakup email>",
  "linkedInMessage": "<50 words max LinkedIn connection message>"
}`;

  const user = `Target site data: ${input.targetSiteData}
Target contact name: ${input.targetName}
Outreach angle: ${input.angle}
Proposed content/pitch: ${input.contentAngle}
Agency info: ${JSON.stringify(input.agencyInfo)}

Generate the personalized outreach sequence.`;

  return { system, user };
}
