import { SYSTEM_PROMPT } from "./system";

export function buildContactGuessPrompt(input: {
  domain: string;
  scrapedPages: string;
  foundNames: string[];
}): { system: string; user: string } {
  const system = `${SYSTEM_PROMPT}

You are an expert at finding the right contact person for link-building outreach. Based on scraped page data and any names found, you determine the most likely email address and contact person.

Common patterns:
- info@domain.com, hello@domain.com, contact@domain.com (generic)
- editor@domain.com, editorial@domain.com (for content sites)
- firstname@domain.com, firstname.lastname@domain.com (personal)
- Roles: content manager, editor, webmaster, SEO manager, marketing director

Prefer the most editorially relevant contact for safe outreach.
Return your best guess with confidence level.`;

  const user = `Find the best contact for outreach on this domain:

Domain: ${input.domain}

Scraped page content:
${input.scrapedPages}

Names found on the site:
${input.foundNames.length > 0 ? input.foundNames.join(", ") : "None found"}

Return JSON:
{
  "bestEmail": "<most likely email>",
  "bestName": "<contact person name or 'Editor'>",
  "role": "<likely role>",
  "confidence": "high" | "medium" | "low",
  "reasoning": "<why you chose this contact>",
  "alternativeEmails": ["<other possible emails>"]
}`;

  return { system, user };
}
