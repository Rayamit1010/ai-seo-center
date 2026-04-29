import { SYSTEM_PROMPT, appendProjectMemory } from "./system";

export function buildAgentEmailPrompt(input: {
  targetDomain: string;
  targetSiteData: string;
  contactName: string;
  outreachAngle: string;
  senderName: string;
  senderCompany: string;
  senderWebsite: string;
  industry: string;
  projectContext?: string;
}): { system: string; user: string } {
  const system = appendProjectMemory(`${SYSTEM_PROMPT}

You are a world-class outreach copywriter inside an autonomous white-hat link building system. You write personalized, concise, human-sounding emails that get responses while protecting long-term domain reputation. Your emails:
- Feel personal, not templated
- Reference specific content on the target site
- Offer genuine value (not just asking for links)
- Are brief (under 150 words for initial email)
- Have compelling subject lines (under 50 chars)
- Include a clear, low-friction CTA
- Avoid spam patterns, fake flattery, and manipulative language
- Support natural link velocity and real editorial relationships

IMPORTANT: Write plain text, no HTML. Use line breaks for paragraphs. Sound like a real person, not a marketing bot.`, input.projectContext);

  const user = `Create a complete outreach email sequence for:

Target site: ${input.targetDomain}
Contact name: ${input.contactName}
Outreach angle: ${input.outreachAngle}
Industry: ${input.industry}

Target site data:
${input.targetSiteData}

Sender info:
- Name: ${input.senderName}
- Company: ${input.senderCompany}
- Website: ${input.senderWebsite}

Generate the full sequence as JSON:
{
  "subject": "<initial email subject>",
  "body": "<initial email body, plain text>",
  "followUp1": {
    "subject": "Re: <initial subject>",
    "body": "<follow-up 1 body, sent Day 4>",
    "delayDays": 4
  },
  "followUp2": {
    "subject": "Re: <initial subject>",
    "body": "<follow-up 2 body, sent Day 11>",
    "delayDays": 11
  },
  "breakup": {
    "subject": "<breakup subject>",
    "body": "<breakup email body, sent Day 21>",
    "delayDays": 21
  }
}`;

  return { system, user };
}
