import type { ScrapedData } from "@/types";

export interface QualificationHeuristic {
  authorityScore: number;
  topicalFit: number;
  editorialQuality: number;
  spamRisk: number;
  linkWorthiness: number;
  positiveSignals: string[];
  redFlags: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function buildQualificationHeuristic(input: {
  scraped: ScrapedData;
  industry: string;
  domain: string;
}): QualificationHeuristic {
  const { scraped } = input;
  const text = `${scraped.title || ""} ${scraped.metaDescription || ""} ${scraped.visibleText}`.toLowerCase();
  const industryTerms = input.industry.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const positiveSignals: string[] = [];
  const redFlags: string[] = [];

  let authorityScore = 20;
  let topicalFit = 25;
  let editorialQuality = 20;
  let spamRisk = 10;

  if (scraped.hasHttps) {
    authorityScore += 8;
    positiveSignals.push("Uses HTTPS");
  }
  if (scraped.hasSchema) {
    authorityScore += 8;
    positiveSignals.push("Structured data detected");
  }
  if (scraped.wordCount >= 800) {
    editorialQuality += 18;
    positiveSignals.push("Substantial on-page content");
  } else if (scraped.wordCount < 250) {
    editorialQuality -= 12;
    spamRisk += 10;
    redFlags.push("Thin content");
  }
  if (scraped.h1Count === 1 && scraped.h2Count >= 2) {
    editorialQuality += 8;
    positiveSignals.push("Clear heading structure");
  }
  if (scraped.imagesWithoutAlt === 0 && scraped.totalImages > 0) {
    editorialQuality += 4;
  }
  if (scraped.externalLinks > 0 && scraped.externalLinks <= 40) {
    authorityScore += 6;
    positiveSignals.push("Normal outbound linking profile");
  }
  if (scraped.externalLinks > 120) {
    spamRisk += 22;
    redFlags.push("Excessive outbound links");
  }
  if (scraped.totalLinks > 250) {
    spamRisk += 16;
    redFlags.push("Link-heavy page footprint");
  }
  if (scraped.loadTime > 6000) {
    authorityScore -= 6;
    redFlags.push("Slow loading site");
  }
  if (!scraped.hasViewport) {
    editorialQuality -= 6;
    redFlags.push("Weak mobile signal");
  }
  if (scraped.metaDescriptionLength >= 110 && scraped.metaDescriptionLength <= 165) {
    editorialQuality += 5;
  }
  if (scraped.titleLength >= 30 && scraped.titleLength <= 70) {
    editorialQuality += 5;
  }
  if (scraped.schemaTypes.length > 2) {
    authorityScore += 4;
  }

  const topicalMatches = industryTerms.filter((term) => text.includes(term)).length;
  if (topicalMatches > 0) {
    topicalFit += clamp(topicalMatches * 12, 0, 36);
    positiveSignals.push("Industry terms align with target niche");
  } else {
    topicalFit -= 15;
    redFlags.push("Weak topical overlap");
  }

  if (includesAny(text, ["casino", "betting", "crypto", "loan", "viagra", "adult"])) {
    spamRisk += 28;
    redFlags.push("Potential spam / risky niche signals");
  }
  if (includesAny(text, ["write for us", "guest post", "contribute"])) {
    topicalFit += 6;
    positiveSignals.push("Clear contributor or partnership opportunity");
  }
  if (includesAny(text, ["ai-generated", "lorem ipsum", "buy now", "sponsored post"])) {
    spamRisk += 18;
    redFlags.push("Low-trust editorial signals");
  }

  authorityScore = clamp(Math.round(authorityScore), 0, 100);
  topicalFit = clamp(Math.round(topicalFit), 0, 100);
  editorialQuality = clamp(Math.round(editorialQuality), 0, 100);
  spamRisk = clamp(Math.round(spamRisk), 0, 100);
  const linkWorthiness = clamp(
    Math.round(authorityScore * 0.3 + topicalFit * 0.3 + editorialQuality * 0.25 + (100 - spamRisk) * 0.15),
    0,
    100
  );

  return {
    authorityScore,
    topicalFit,
    editorialQuality,
    spamRisk,
    linkWorthiness,
    positiveSignals: [...new Set(positiveSignals)].slice(0, 5),
    redFlags: [...new Set(redFlags)].slice(0, 5),
  };
}
