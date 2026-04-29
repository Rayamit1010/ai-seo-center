import type { ScrapedData } from "@/types";

/** Quick rule-based scoring for bulk analysis (no AI) */
export function quickScore(data: ScrapedData): {
  score: number;
  issues: string[];
} {
  let score = 100;
  const issues: string[] = [];

  // Title tag
  if (!data.title) {
    score -= 15;
    issues.push("Missing title tag");
  } else if (data.titleLength < 30) {
    score -= 8;
    issues.push(`Title too short (${data.titleLength} chars)`);
  } else if (data.titleLength > 60) {
    score -= 5;
    issues.push(`Title too long (${data.titleLength} chars)`);
  }

  // Meta description
  if (!data.metaDescription) {
    score -= 12;
    issues.push("Missing meta description");
  } else if (data.metaDescriptionLength < 70) {
    score -= 5;
    issues.push(`Meta description too short (${data.metaDescriptionLength} chars)`);
  } else if (data.metaDescriptionLength > 160) {
    score -= 3;
    issues.push(`Meta description too long (${data.metaDescriptionLength} chars)`);
  }

  // H1
  if (data.h1Count === 0) {
    score -= 10;
    issues.push("Missing H1 tag");
  } else if (data.h1Count > 1) {
    score -= 5;
    issues.push(`Multiple H1 tags (${data.h1Count})`);
  }

  // Content length
  if (data.wordCount < 300) {
    score -= 10;
    issues.push(`Thin content (${data.wordCount} words)`);
  } else if (data.wordCount < 600) {
    score -= 5;
    issues.push(`Content could be longer (${data.wordCount} words)`);
  }

  // Images without alt
  if (data.imagesWithoutAlt > 0) {
    const penalty = Math.min(data.imagesWithoutAlt * 2, 10);
    score -= penalty;
    issues.push(`${data.imagesWithoutAlt} images missing alt text`);
  }

  // HTTPS
  if (!data.hasHttps) {
    score -= 10;
    issues.push("Not using HTTPS");
  }

  // Viewport
  if (!data.hasViewport) {
    score -= 8;
    issues.push("Missing viewport meta tag");
  }

  // Schema
  if (!data.hasSchema) {
    score -= 5;
    issues.push("No structured data (JSON-LD) detected");
  }

  // Canonical
  if (!data.canonical) {
    score -= 3;
    issues.push("Missing canonical tag");
  }

  // OG tags
  if (!data.ogTitle || !data.ogDescription) {
    score -= 3;
    issues.push("Missing Open Graph meta tags");
  }

  // Internal links
  if (data.internalLinks < 3) {
    score -= 5;
    issues.push(`Low internal link count (${data.internalLinks})`);
  }

  // HTML size
  if (data.htmlSize > 200) {
    score -= 5;
    issues.push(`Large HTML size (${data.htmlSize}KB)`);
  }

  return { score: Math.max(0, score), issues };
}

/** Build a context string for Claude from scraped data */
export function buildAuditContext(data: ScrapedData): string {
  return JSON.stringify(
    {
      url: data.url,
      statusCode: data.statusCode,
      loadTime: `${data.loadTime}ms`,
      title: data.title,
      titleLength: data.titleLength,
      metaDescription: data.metaDescription,
      metaDescriptionLength: data.metaDescriptionLength,
      metaKeywords: data.metaKeywords,
      canonical: data.canonical,
      robots: data.robots,
      ogTitle: data.ogTitle,
      ogDescription: data.ogDescription,
      ogImage: data.ogImage,
      h1: data.h1,
      h2: data.h2,
      h3: data.h3,
      h1Count: data.h1Count,
      h2Count: data.h2Count,
      wordCount: data.wordCount,
      visibleTextPreview: data.visibleText.slice(0, 1500),
      totalImages: data.totalImages,
      imagesWithoutAlt: data.imagesWithoutAlt,
      imagesWithAlt: data.imagesWithAlt,
      totalLinks: data.totalLinks,
      internalLinks: data.internalLinks,
      externalLinks: data.externalLinks,
      schemaTypes: data.schemaTypes,
      hasSchema: data.hasSchema,
      hasViewport: data.hasViewport,
      hasHttps: data.hasHttps,
      htmlSizeKB: data.htmlSize,
      twitterCard: data.twitterCard,
    },
    null,
    2
  );
}
