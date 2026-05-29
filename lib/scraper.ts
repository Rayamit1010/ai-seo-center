import * as cheerio from "cheerio";
import type { ScrapedData } from "@/types";
import { normalizeUrl, isValidUrl } from "@/lib/utils";

const MAX_HTML_BYTES = 3_000_000;

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    [
      "localhost",
      "0.0.0.0",
      "127.0.0.1",
      "::1",
      "0:0:0:0:0:0:0:1",
      "169.254.169.254",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    normalized.startsWith("10.") ||
    normalized.startsWith("127.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized) ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  ) {
    return true;
  }

  return false;
}

export function assertSafeScrapeTarget(url: string) {
  const hostname = new URL(url).hostname;
  if (isBlockedHostname(hostname)) {
    throw new Error("Internal URLs are not allowed");
  }
}

const MAX_REDIRECTS = 5;

/**
 * fetch() wrapper that follows redirects manually so each hop can be validated
 * against the SSRF blocklist. Using redirect:"follow" would silently follow a
 * redirect from a public host to an internal IP.
 */
async function safeFetch(
  url: string,
  options: Omit<RequestInit, "redirect">
): Promise<Response> {
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(currentUrl, { ...options, redirect: "manual" });

    const isRedirect = res.status >= 300 && res.status < 400;
    if (!isRedirect) return res;

    const location = res.headers.get("location");
    if (!location) return res; // redirect with no Location → return as-is

    // Resolve relative Location headers against the current URL
    const nextUrl = new URL(location, currentUrl).href;
    assertSafeScrapeTarget(nextUrl); // SSRF check on every hop
    currentUrl = nextUrl;
  }

  throw new Error("Too many redirects");
}

function assertHtmlResponse(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (
    contentType &&
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml+xml")
  ) {
    throw new Error("Only HTML pages can be audited right now.");
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
    throw new Error("The page is too large to audit safely in one request.");
  }
}

/** Scrape a URL and extract comprehensive SEO data */
export async function scrapeUrl(targetUrl: string): Promise<ScrapedData> {
  const url = normalizeUrl(targetUrl);
  if (!isValidUrl(url)) {
    throw new Error("Invalid URL provided");
  }

  assertSafeScrapeTarget(url);

  const startTime = Date.now();

  const response = await safeFetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; TechGeekStudioBot/1.0; +https://techgeekstudio.com)",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    signal: AbortSignal.timeout(15000),
  });
  assertHtmlResponse(response);

  const html = await response.text();
  if (Buffer.byteLength(html, "utf-8") > MAX_HTML_BYTES) {
    throw new Error("The page is too large to audit safely in one request.");
  }
  const loadTime = Date.now() - startTime;

  return parseHtml(html, url, response.status, loadTime);
}

/** Parse raw HTML and extract SEO data */
export function parseHtml(
  html: string,
  url: string,
  statusCode: number = 200,
  loadTime: number = 0
): ScrapedData {
  const $ = cheerio.load(html);
  const baseUrl = new URL(url);

  // ──── Meta Tags ────
  const title = $("title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;
  const metaKeywords =
    $('meta[name="keywords"]').attr("content")?.trim() || null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;
  const robots =
    $('meta[name="robots"]').attr("content")?.trim() || null;

  // ──── Open Graph ────
  const ogTitle =
    $('meta[property="og:title"]').attr("content")?.trim() || null;
  const ogDescription =
    $('meta[property="og:description"]').attr("content")?.trim() || null;
  const ogImage =
    $('meta[property="og:image"]').attr("content")?.trim() || null;

  // ──── Twitter Card ────
  const twitterCard =
    $('meta[name="twitter:card"]').attr("content")?.trim() || null;

  // ──── Headings ────
  const h1: string[] = [];
  const h2: string[] = [];
  const h3: string[] = [];
  const h4: string[] = [];

  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1.push(text);
  });
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2.push(text);
  });
  $("h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h3.push(text);
  });
  $("h4").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h4.push(text);
  });

  // ──── Content ────
  // Remove script, style, and non-visible elements
  $("script, style, noscript, iframe, svg, nav, footer, header").remove();
  const visibleTextFull = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = visibleTextFull
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const visibleText = visibleTextFull.slice(0, 3000);

  // ──── Images ────
  let totalImages = 0;
  let imagesWithoutAlt = 0;
  let imagesWithAlt = 0;

  // Re-load HTML since we removed elements above
  const $fresh = cheerio.load(html);
  $fresh("img").each((_, el) => {
    totalImages++;
    const alt = $fresh(el).attr("alt");
    if (alt && alt.trim().length > 0) {
      imagesWithAlt++;
    } else {
      imagesWithoutAlt++;
    }
  });

  // ──── Links ────
  let totalLinks = 0;
  let internalLinks = 0;
  let externalLinks = 0;
  const externalLinkUrls: string[] = [];

  $fresh("a[href]").each((_, el) => {
    totalLinks++;
    const href = $fresh(el).attr("href") || "";
    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname === baseUrl.hostname) {
        internalLinks++;
      } else {
        externalLinks++;
        externalLinkUrls.push(linkUrl.toString());
      }
    } catch {
      internalLinks++; // Relative links
    }
  });

  // ──── Schema.org / JSON-LD ────
  const schemaTypes: string[] = [];
  const schemaRaw: string[] = [];

  $fresh('script[type="application/ld+json"]').each((_, el) => {
    const content = $fresh(el).html();
    if (content) {
      schemaRaw.push(content.trim());
      try {
        const parsed = JSON.parse(content);
        if (parsed["@type"]) {
          schemaTypes.push(parsed["@type"]);
        }
        if (Array.isArray(parsed["@graph"])) {
          for (const item of parsed["@graph"]) {
            if (item["@type"]) {
              schemaTypes.push(item["@type"]);
            }
          }
        }
      } catch {
        // Invalid JSON-LD
      }
    }
  });

  // ──── Technical Signals ────
  const hasViewport = $fresh('meta[name="viewport"]').length > 0;
  const hasHttps = url.startsWith("https://");
  const htmlSize = Math.round(Buffer.byteLength(html, "utf-8") / 1024);

  return {
    url,
    statusCode,
    loadTime,
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    metaKeywords,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    h1,
    h2,
    h3,
    h4,
    h1Count: h1.length,
    h2Count: h2.length,
    wordCount,
    visibleText,
    totalImages,
    imagesWithoutAlt,
    imagesWithAlt,
    totalLinks,
    internalLinks,
    externalLinks,
    externalLinkUrls,
    brokenLinksCount: 0, // Would require additional requests
    schemaTypes,
    hasSchema: schemaTypes.length > 0,
    schemaRaw,
    hasViewport,
    hasHttps,
    htmlSize,
    twitterCard,
  };
}
