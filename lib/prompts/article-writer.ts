export const ARTICLE_SYSTEM_PROMPT = `You are an expert SEO content writer who produces high-quality, engaging, and well-structured long-form articles optimized for search engines. Your articles are:
- Comprehensive and authoritative (1500-3000 words)
- Structured with clear H2/H3 headings
- Rich in LSI keywords naturally woven throughout
- Written for the specified tone and target audience
- Optimized for the target keyword without keyword stuffing
- Formatted in clean Markdown

CRITICAL: Respond ONLY with a valid JSON object. No markdown code fences, no explanation text.`;

export interface ArticleOutput {
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  wordCount: number;
  readingTime: number;
}

export function buildArticlePrompt(
  keyword: string,
  tone: string,
  outline: string,
  lsiKeywords: string[],
  targetAudience: string,
  wordCount: number
): string {
  return `Write a comprehensive SEO-optimized article for the following:

**Target Keyword:** ${keyword}
**Tone:** ${tone}
**Target Audience:** ${targetAudience}
**Target Word Count:** ${wordCount} words

${outline ? `**Outline to follow:**\n${outline}\n` : ""}
${lsiKeywords.length > 0 ? `**LSI Keywords to naturally include:**\n${lsiKeywords.join(", ")}\n` : ""}

Write a complete, publication-ready article. Format the content in clean Markdown with proper H2 and H3 headings.

Respond with ONLY this JSON object:
{
  "title": "Compelling H1 title (50-65 characters)",
  "metaTitle": "SEO meta title (max 60 chars)",
  "metaDescription": "Compelling meta description (max 160 chars)",
  "content": "Full article in Markdown format",
  "wordCount": estimated_word_count_number,
  "readingTime": estimated_reading_minutes_number
}`;
}
