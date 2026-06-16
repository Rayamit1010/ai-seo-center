import assert from "node:assert/strict";
import test from "node:test";
import { buildCompetitorAnalysisPrompt, buildGrowthOpportunitiesPrompt } from "../lib/prompts/growth";

test("competitor analysis prompt includes competitor domain", () => {
  const { user } = buildCompetitorAnalysisPrompt({
    competitorDomain: "rival.com",
    trackedKeywords: [],
  });
  assert.match(user, /rival\.com/, "user prompt should mention the competitor domain");
});

test("competitor analysis prompt includes user website when provided", () => {
  const { user } = buildCompetitorAnalysisPrompt({
    competitorDomain: "rival.com",
    userWebsite: "mysite.com",
    trackedKeywords: [],
  });
  assert.match(user, /mysite\.com/);
});

test("competitor analysis prompt lists tracked keywords (up to 30)", () => {
  const keywords = Array.from({ length: 35 }, (_, i) => `keyword-${i}`);
  const { user } = buildCompetitorAnalysisPrompt({
    competitorDomain: "rival.com",
    trackedKeywords: keywords,
  });
  // First 30 should appear, 31st should not
  assert.match(user, /keyword-29/);
  assert.doesNotMatch(user, /keyword-30/, "should not include keyword beyond index 29");
});

test("competitor analysis prompt falls back gracefully with no keywords", () => {
  const { user } = buildCompetitorAnalysisPrompt({
    competitorDomain: "rival.com",
    trackedKeywords: [],
  });
  assert.ok(user.includes("none provided"));
});

test("competitor analysis prompt requests the expected JSON fields", () => {
  const { user } = buildCompetitorAnalysisPrompt({ competitorDomain: "rival.com", trackedKeywords: [] });
  for (const field of ["summary", "strengths", "weaknesses", "contentGaps", "keywordOpportunities", "backlinkGaps", "quickWins"]) {
    assert.ok(user.includes(`"${field}"`), `prompt should request "${field}" field`);
  }
});

test("growth opportunities prompt mentions all competitor names", () => {
  const { user } = buildGrowthOpportunitiesPrompt({
    competitors: ["Alpha Inc", "Beta Corp"],
    topKeywords: [],
    rankSummary: { improved: 0, declined: 0, top10: 0 },
    backlinkCount: 0,
  });
  assert.ok(user.includes("Alpha Inc"));
  assert.ok(user.includes("Beta Corp"));
});

test("growth opportunities prompt reflects rank summary numbers", () => {
  const { user } = buildGrowthOpportunitiesPrompt({
    competitors: [],
    topKeywords: [],
    rankSummary: { improved: 7, declined: 3, top10: 12 },
    backlinkCount: 42,
  });
  assert.ok(user.includes("7"), "should mention improved count");
  assert.ok(user.includes("3"), "should mention declined count");
  assert.ok(user.includes("12"), "should mention top-10 count");
  assert.ok(user.includes("42"), "should mention backlink count");
});

test("growth opportunities prompt requests overallScore and priorityActions fields", () => {
  const { user } = buildGrowthOpportunitiesPrompt({
    competitors: [],
    topKeywords: [],
    rankSummary: { improved: 0, declined: 0, top10: 0 },
    backlinkCount: 0,
  });
  for (const field of ["overallScore", "momentumLabel", "priorityActions", "contentStrategy", "technicalFixes", "linkBuildingFocus", "quarterlyGoals"]) {
    assert.ok(user.includes(`"${field}"`), `prompt should request "${field}" field`);
  }
});

test("system prompt instructs model to return raw JSON", () => {
  const { system } = buildCompetitorAnalysisPrompt({ competitorDomain: "rival.com", trackedKeywords: [] });
  assert.ok(system.toLowerCase().includes("json"), "system prompt should mention JSON");
});
