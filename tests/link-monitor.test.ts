import assert from "node:assert/strict";
import test from "node:test";
import { findBacklinkInHtml } from "../lib/scraper";

test("finds a dofollow link to the target domain", () => {
  const html = `<html><body><a href="https://example.com/page">Great SEO Tool</a></body></html>`;
  const result = findBacklinkInHtml(html, "https://referrer.com/post", "example.com");

  assert.equal(result.linkFound, true);
  assert.equal(result.dofollow, true);
  assert.equal(result.anchorText, "Great SEO Tool");
});

test("detects rel=nofollow links", () => {
  const html = `<html><body><a href="https://example.com/page" rel="nofollow">Great SEO Tool</a></body></html>`;
  const result = findBacklinkInHtml(html, "https://referrer.com/post", "example.com");

  assert.equal(result.linkFound, true);
  assert.equal(result.dofollow, false);
});

test("matches target hostname regardless of www prefix", () => {
  const html = `<html><body><a href="https://www.example.com/page">Link</a></body></html>`;
  const result = findBacklinkInHtml(html, "https://referrer.com/post", "example.com");

  assert.equal(result.linkFound, true);
});

test("returns linkFound false when no matching link is present", () => {
  const html = `<html><body><a href="https://other.com/page">Link</a></body></html>`;
  const result = findBacklinkInHtml(html, "https://referrer.com/post", "example.com");

  assert.equal(result.linkFound, false);
  assert.equal(result.dofollow, null);
  assert.equal(result.anchorText, null);
});

test("resolves relative hrefs against the page URL", () => {
  const html = `<html><body><a href="/out?to=example.com">Relative</a></body></html>`;
  const result = findBacklinkInHtml(html, "https://referrer.com/post", "example.com");

  assert.equal(result.linkFound, false);
});
