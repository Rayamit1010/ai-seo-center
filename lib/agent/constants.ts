import type { PipelineConfig } from "./types";

/** Default pipeline configuration for new campaigns */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  dailyDiscoverLimit: 10,
  dailyEmailLimit: 50,
  minQualityScore: 40,
  minRelevanceScore: 3,
  followUpDays: [4, 11, 21],
  preferredAngles: ["guest_post", "resource_link", "niche_edit"],
  blockedDomains: [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "aol.com",
    "icloud.com",
    "protonmail.com",
  ],
};

/** Max items to process per heartbeat per stage */
export const BATCH_SIZES = {
  discover: 5,
  qualify: 3,
  findContact: 3,
  draftEmail: 3,
  sendEmail: 5,
  track: 5,
} as const;

/** Heartbeat interval in milliseconds (client-side polling) */
export const HEARTBEAT_INTERVAL_MS = 60_000;

/** Max agent run duration before considering it stale */
export const STALE_RUN_MS = 5 * 60 * 1000;

/** Pages to scrape when looking for contact emails */
export const CONTACT_PAGES = [
  "/contact",
  "/contact-us",
  "/about",
  "/about-us",
  "/team",
  "/write-for-us",
  "/guest-post",
  "/contribute",
];

/** Email regex for scraping */
export const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Ordered pipeline stages */
export const PIPELINE_STAGES = [
  "discovered",
  "qualifying",
  "qualified",
  "finding_contact",
  "contact_found",
  "drafting_email",
  "email_drafted",
  "sending",
  "email_sent",
  "follow_up_1",
  "follow_up_2",
  "breakup_sent",
  "completed",
  "replied",
  "rejected",
  "failed",
] as const;

/** Human-readable stage labels */
export const STAGE_LABELS: Record<string, string> = {
  discovered: "Discovered",
  qualifying: "Qualifying...",
  qualified: "Qualified",
  finding_contact: "Finding Contact...",
  contact_found: "Contact Found",
  drafting_email: "Drafting Email...",
  email_drafted: "Email Ready",
  sending: "Sending...",
  email_sent: "Email Sent",
  follow_up_1: "Follow-up 1 Sent",
  follow_up_2: "Follow-up 2 Sent",
  breakup_sent: "Breakup Sent",
  completed: "Completed",
  replied: "Replied",
  rejected: "Rejected",
  failed: "Failed",
};
