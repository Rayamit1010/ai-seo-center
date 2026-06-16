import { SYSTEM_PROMPT } from "./system";

export function buildPressReleasePrompt(input: {
  topic: string;
  angle: string;
  niche: string;
  keyMessages: string[];
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

You are a Digital PR specialist generating a newsworthy press release. Return ONLY valid JSON.

JSON structure:
{
  "headline": "<compelling headline under 100 chars>",
  "subheadline": "<supporting subheadline under 150 chars>",
  "dateline": "<CITY, Month DD, YYYY —>",
  "intro": "<first paragraph covering who/what/when/where/why in 2-3 sentences>",
  "bodyParagraphs": ["<body paragraph 1>", "<body paragraph 2>", "<body paragraph 3>"],
  "quote": {
    "text": "<executive or expert quote, 1-2 sentences>",
    "attribution": "<Name, Title, Company>"
  },
  "boilerplate": "<about the company paragraph, 2-4 sentences>",
  "distributionAngles": ["<angle for tech media>", "<angle for industry press>", "<angle for general business press>"]
}`;

  const user = `Generate a newsworthy press release for:
- Topic: ${input.topic}
- News Angle: ${input.angle}
- Industry/Niche: ${input.niche}
${input.keyMessages.length > 0 ? `- Key Messages:\n${input.keyMessages.map((m, i) => `  ${i + 1}. ${m}`).join("\n")}` : ""}`;

  return { system, user };
}

export function buildPitchEmailPrompt(input: {
  topic: string;
  angle: string;
  headline: string;
  contactName: string;
  publication: string;
  beat: string;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

You are a Digital PR specialist writing a personalized journalist pitch. Return ONLY valid JSON.

JSON structure:
{
  "subject": "<compelling subject line under 60 chars>",
  "greeting": "<Hi [Name],>",
  "hook": "<2-3 sentences connecting to their specific beat and readership>",
  "pitch": "<2-3 sentences with the core story angle and why their readers care>",
  "teaser": "<1-2 sentences referencing the attached press release and a key data point>",
  "cta": "<clear single call to action>",
  "signature": "<sign-off block>"
}`;

  const user = `Write a journalist pitch email for:
- Journalist: ${input.contactName} at ${input.publication}
- Their Beat/Focus: ${input.beat}
- Story: ${input.topic}
- News Angle: ${input.angle}
- Press Release Headline: ${input.headline}`;

  return { system, user };
}

export function buildPublicationSuggestionsPrompt(input: {
  topic: string;
  niche: string;
  angle: string;
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

You are a Digital PR specialist identifying optimal media targets. Return ONLY valid JSON.

JSON structure:
{
  "publications": [
    {
      "name": "<publication name>",
      "url": "<homepage URL>",
      "beat": "<relevant section or beat>",
      "readerType": "<who reads this publication>",
      "pitchTips": "<specific angle or hook that works here>",
      "tier": "A|B|C",
      "estimatedDA": <estimated domain authority 1-100>
    }
  ]
}`;

  const user = `Suggest 12 publications to pitch for:
- Story Topic: ${input.topic}
- Industry/Niche: ${input.niche}
- News Angle: ${input.angle}

Include Tier A (major outlets, DA 70+), Tier B (niche leaders, DA 40-70), and Tier C (targeted blogs/newsletters, DA 20-40).`;

  return { system, user };
}
