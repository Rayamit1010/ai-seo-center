export type ReviewSeverity = "Critical" | "High" | "Medium" | "Low";

export type ReviewFinding = {
  severity: ReviewSeverity;
  title: string;
  problem: string;
  whyItMatters: string;
  resolution: string;
  impactedFiles: string[];
};

export type CodeChangeExample = {
  title: string;
  context: string;
  before: string;
  after: string;
  outcome: string;
};

export type ReviewDocumentData = {
  title: string;
  subtitle: string;
  generatedOn: string;
  repositoryRoot: string;
  projectPurpose: string;
  currentFlow: string[];
  techStack: string[];
  modules: string[];
  findings: ReviewFinding[];
  fixesApplied: string[];
  uiUxImprovements: string[];
  backendImprovements: string[];
  databaseImprovements: string[];
  apiImprovements: string[];
  featureEnhancements: string[];
  performanceOptimizations: string[];
  structureImprovements: string[];
  databaseIndexes: string[];
  codeChanges: CodeChangeExample[];
  verification: string[];
  nextSteps: string[];
};

export const ENGINEERING_REVIEW: ReviewDocumentData = {
  title: "SEO Command Center Engineering Review",
  subtitle:
    "Strict architecture, code quality, security, performance, and product scalability assessment",
  generatedOn: "2026-04-09",
  repositoryRoot: "B:\\AI SEO Agent\\seo-command-center",
  projectPurpose:
    "SEO Command Center is a multi-workspace SEO operations platform that combines AI-assisted SEO chat, audit storage, website strategy memory, backlink automation, recurring reporting, content publishing, and operational monitoring in one Next.js application.",
  currentFlow: [
    "Users authenticate with credential-based NextAuth and enter a protected dashboard.",
    "Project profiles store per-website strategy memory, Google/Search/CMS connection settings, and publishing preferences.",
    "Audits, reports, and backlink campaigns are created through App Router APIs backed by Prisma services.",
    "AI chat and compare flows resolve the most relevant project profile, route requests across multiple providers, and persist full session history.",
    "Background work such as recurring reports, audits, and autonomous backlink cycles runs through a durable queue and drain worker.",
    "Ops and analytics surfaces expose queue health, AI provider behavior, delivery status, and incidents in plain language.",
  ],
  techStack: [
    "Next.js 16 App Router",
    "React 19 + TypeScript",
    "Prisma ORM",
    "SQLite for local development and Postgres-ready schema workflow for production",
    "NextAuth credentials authentication",
    "Tailwind CSS + Radix UI",
    "Zod validation",
    "Resend email delivery",
    "Playwright browser testing",
    "Multi-provider AI routing for Claude, ChatGPT, Gemini, Grok, and Groq",
  ],
  modules: [
    "Dashboard and Ops Center",
    "AI Chat and AI Analytics",
    "Projects / website memory",
    "Backlink Agent and outreach workflow",
    "Reports, delivery logs, and schedules",
    "Content operations and CMS publishing",
    "Queue processing and worker orchestration",
    "Shared service, validation, auth, response, and observability layers",
  ],
  findings: [
    {
      severity: "Critical",
      title: "Recurring report schedules could be duplicated after worker crashes",
      problem:
        "Claiming a due schedule previously placed a lease on the current run but did not advance nextRunAt immediately.",
      whyItMatters:
        "If a worker crashed after claiming but before marking the run complete, the same schedule could become due again and create duplicate client reports or owner digests.",
      resolution:
        "The schedule claim path now advances nextRunAt at claim time, stores processingRunAt separately, and clears or restores the correct run timestamp on completion/failure.",
      impactedFiles: [
        "lib/services/report-automation-service.ts",
        "lib/server/job-queue.ts",
      ],
    },
    {
      severity: "High",
      title: "Queue events were not scoped tightly enough per user",
      problem:
        "Recent job events were effectively global, which allowed one operator's queue outcomes to appear in another operator's notifications or Ops view.",
      whyItMatters:
        "This is a data-boundary leak. Even if it does not expose credentials, it exposes operational activity that belongs to another account.",
      resolution:
        "Queue event retrieval is now filtered by userId everywhere user-facing incidents are shown.",
      impactedFiles: [
        "lib/server/job-queue.ts",
        "app/api/notifications/route.ts",
        "app/api/ops/overview/route.ts",
      ],
    },
    {
      severity: "High",
      title: "Same-origin protection was inconsistent across mutating APIs",
      problem:
        "Several authenticated write endpoints relied only on session auth and omitted an origin check.",
      whyItMatters:
        "Authenticated APIs without same-origin enforcement are more exposed to CSRF-style browser abuse, especially in cookie-based auth systems.",
      resolution:
        "A shared same-origin guard is now enforced consistently across remaining mutating APIs, with human-readable 403 responses.",
      impactedFiles: [
        "lib/server/csrf.ts",
        "app/api/chat/route.ts",
        "app/api/content/publish/route.ts",
        "app/api/reports/route.ts",
        "app/api/register/route.ts",
      ],
    },
    {
      severity: "High",
      title: "The async processing layer was not durable enough for production-style automation",
      problem:
        "Queue work originally depended on memory-oriented execution paths without durable retries, dead-letter behavior, or lease-based claiming.",
      whyItMatters:
        "That makes automation brittle under crashes, restarts, and multiple workers. It also makes incident recovery much harder.",
      resolution:
        "A database-backed BackgroundJob model now stores job payloads, status, attempts, leases, retry timing, and dead-letter outcomes.",
      impactedFiles: [
        "prisma/schema.prisma",
        "lib/server/job-queue.ts",
        "scripts/drain-jobs.ts",
      ],
    },
    {
      severity: "Medium",
      title: "Reports workspace made too many client-side requests",
      problem:
        "The reports screen loaded through a six-request client waterfall instead of a single aggregated API response.",
      whyItMatters:
        "This increased page latency, duplicated error handling, and made the screen feel fragile when any one endpoint failed.",
      resolution:
        "A dedicated reports workspace endpoint now aggregates audits, reports, schedules, deliveries, and project counts in one call.",
      impactedFiles: [
        "app/api/reports/workspace/route.ts",
        "app/(dashboard)/reports/page.tsx",
      ],
    },
    {
      severity: "Medium",
      title: "Project profile parsing could crash on partial legacy JSON",
      problem:
        "Nested JSON-like fields such as backlinkRules and contentPlaybook assumed fully formed objects and arrays.",
      whyItMatters:
        "Legacy or malformed records could trigger runtime crashes in the Projects UI and downstream AI context builders.",
      resolution:
        "Normalization helpers now safely parse arrays and nested objects, defaulting invalid shapes to empty, typed values.",
      impactedFiles: [
        "lib/services/project-profile-service.ts",
      ],
    },
    {
      severity: "Medium",
      title: "Documentation drifted behind the codebase",
      problem:
        "SRS, ERD, and architecture docs still described several integrations and queue behaviors as future work after they had already been implemented.",
      whyItMatters:
        "When documentation lags behind the code, onboarding, auditing, and future architecture decisions become error-prone.",
      resolution:
        "README, SRS, Architecture, ERD, and Features docs were updated to reflect the current queue model, integrations, and data structures.",
      impactedFiles: [
        "README.md",
        "docs/SRS.md",
        "docs/ARCHITECTURE.md",
        "docs/ERD.md",
        "docs/FEATURES.md",
      ],
    },
    {
      severity: "Medium",
      title: "There was not enough browser-level regression coverage for critical dashboards",
      problem:
        "The project had strong lint/build checks, but lacked real browser verification for reports, projects, and publishing flows.",
      whyItMatters:
        "Pure unit/build checks do not catch real UI breakages, rendering mismatches, or cross-route interaction regressions.",
      resolution:
        "A Playwright suite now covers Projects, Reports, and Content flows with a dedicated mock CMS endpoint for safe test execution.",
      impactedFiles: [
        "playwright.config.ts",
        "tests/browser/projects.spec.ts",
        "tests/browser/reports.spec.ts",
        "tests/browser/content.spec.ts",
      ],
    },
  ],
  fixesApplied: [
    "Implemented a durable database-backed queue with retries, lease handling, and dead-letter behavior.",
    "Fixed schedule claiming so recurring reports cannot silently duplicate after worker interruption.",
    "Scoped user-visible job incidents per operator account.",
    "Expanded same-origin enforcement across mutating APIs.",
    "Consolidated the reports screen into a single aggregated workspace endpoint.",
    "Hardened project profile parsing for partial and malformed nested data.",
    "Corrected documentation drift so architecture and schema docs match the running codebase.",
    "Added browser-level regression coverage for critical operator workflows.",
  ],
  uiUxImprovements: [
    "Reports now load through a faster workspace endpoint, reducing spinner churn and split-failure states.",
    "Ops Center exposes processing and dead-letter jobs more clearly, which improves operator trust in automation.",
    "Projects integration settings now support connection diagnostics instead of silent failure later in the workflow.",
    "Register UI now matches backend password policy so operators are not blocked by mismatched validation rules.",
  ],
  backendImprovements: [
    "Queue processing is now durable and resumable, with clear status transitions and final-failure cleanup behavior.",
    "Route handlers consistently use shared auth, response, validation, CSRF, and observability helpers.",
    "Report schedule execution separates claim time from completion time, making retries and failure semantics safer.",
    "Project services now normalize structured JSON fields before UI or AI layers consume them.",
  ],
  databaseImprovements: [
    "Added a BackgroundJob model to persist async work and worker leases.",
    "Retained targeted indexes for audits, reports, chat sessions, telemetry, backlink prospects, and schedules.",
    "Kept a Postgres-ready schema workflow while preserving SQLite for local development.",
    "Improved schema documentation so data relationships remain auditable as the platform grows.",
  ],
  apiImprovements: [
    "Created `/api/reports/workspace` to replace a multi-endpoint waterfall with one structured payload.",
    "Standardized same-origin checks on remaining write endpoints.",
    "Added route-level timing instrumentation for heavy dashboards and workspace APIs.",
    "Improved error handling so failures surface in operator-friendly language instead of raw technical noise.",
  ],
  featureEnhancements: [
    "Durable background job system with retries, leases, and dead-letter handling.",
    "Project integration diagnostics for Search Console, GA4, and CMS settings.",
    "Browser regression suite for Projects, Reports, and Content workflows.",
  ],
  performanceOptimizations: [
    "Parallelized high-value dashboard query groups with Promise.all where the data is independent.",
    "Removed a client-side waterfall from the reports workspace.",
    "Added slow-route timing instrumentation so expensive APIs can be measured instead of guessed about.",
    "Preserved indexed access paths for schedule polling, chat ordering, telemetry windows, and backlink pipeline views.",
    "Shifted automation state out of memory-only execution into a queryable durable store.",
  ],
  structureImprovements: [
    "Validation concerns are now centralized under lib/validation instead of repeated inline in routes.",
    "Operational helpers such as CSRF, observability, and queue logic are now reusable modules instead of ad hoc logic.",
    "Documentation now mirrors the actual architecture, which reduces future design drift.",
    "The repo can now regenerate an executive engineering review package from source data and a build script.",
  ],
  databaseIndexes: [
    "Audit(userId, createdAt desc)",
    "Audit(userId, status, createdAt desc)",
    "ChatSession(userId, updatedAt desc)",
    "ReportSchedule(isActive, nextRunAt, leaseUntil)",
    "BacklinkProspect(userId, stage, createdAt desc)",
    "BacklinkProspect(campaignId, linkAcquired)",
    "AIProviderEvent(userId, providerId, createdAt)",
    "BackgroundJob(status, availableAt, leaseUntil)",
  ],
  codeChanges: [
    {
      title: "Prevent duplicate recurring reports after worker interruption",
      context:
        "The schedule lease logic needed to move nextRunAt forward as soon as the due schedule was claimed.",
      before: `data: {
  leaseUntil,
  processingRunAt: schedule.nextRunAt,
}`,
      after: `data: {
  leaseUntil,
  processingRunAt: schedule.nextRunAt,
  nextRunAt,
}`,
      outcome:
        "The next schedule window is reserved immediately, so the same report run is not re-queued after a lease timeout.",
    },
    {
      title: "Replace reports-page request waterfall with one workspace API",
      context:
        "The reports UI originally made several independent requests and stitched them together client-side.",
      before: `const [auditsRes, reportsRes, schedulesRes, deliveriesRes, projectsRes, agentStatsRes] =
  await Promise.all([...six fetches...]);`,
      after: `const response = await fetch("/api/reports/workspace");
const payload = await response.json();`,
      outcome:
        "The page is faster, failure handling is simpler, and the API boundary is easier to evolve.",
    },
    {
      title: "Normalize nested project memory payloads safely",
      context:
        "Project memory fields could contain partial or legacy JSON that did not match the latest UI shape.",
      before: `backlinkRules: JSON.parse(profile.backlinkRules),
contentPlaybook: JSON.parse(profile.contentPlaybook),`,
      after: `backlinkRules: parseBacklinkRules(profile.backlinkRules),
contentPlaybook: parseContentPlaybook(profile.contentPlaybook),
nichePlaybook: parseNichePlaybook(profile.nichePlaybook),`,
      outcome:
        "Projects no longer crash when an older record is missing arrays or nested properties.",
    },
    {
      title: "Introduce durable queue semantics instead of memory-only job execution",
      context:
        "Async processing needed production-safe retry and recovery behavior.",
      before: `queue.push(job);
setTimeout(() => runJob(job), 0);`,
      after: `await prisma.backgroundJob.create({
  data: {
    userId,
    jobName: job.name,
    payload: JSON.stringify(job.payload),
    status: "pending",
    maxAttempts: getJobMaxAttempts(job.name),
  },
});`,
      outcome:
        "Background work survives restarts, supports leasing, and exposes dead-letter state for recovery.",
    },
  ],
  verification: [
    "pnpm exec prisma db push",
    "pnpm exec prisma generate",
    "pnpm db:generate:postgres",
    "pnpm test",
    "pnpm lint",
    "pnpm exec tsc --noEmit",
    "pnpm test:browser",
    "pnpm build",
  ],
  nextSteps: [
    "Promote PostgreSQL as the production database default and document backup/migration procedures.",
    "Move queue execution to a shared Redis or workflow engine once the platform runs across multiple application instances.",
    "Add OAuth-style onboarding for Google integrations so operators do not have to manage service-account JSON manually.",
    "Introduce RBAC and approval flows if the platform expands from a single operator to multiple team members.",
    "Add cost analytics for AI providers, email delivery, and automation throughput so the Ops layer can optimize for ROI as well as uptime.",
  ],
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderBulletList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function renderReviewMarkdown(data: ReviewDocumentData) {
  const findings = data.findings
    .map(
      (finding, index) => `### ${index + 1}. ${finding.title} (${finding.severity})

**Problem:** ${finding.problem}

**Why it matters:** ${finding.whyItMatters}

**Resolution:** ${finding.resolution}

**Impacted files:** ${finding.impactedFiles.join(", ")}
`
    )
    .join("\n");

  const codeChanges = data.codeChanges
    .map(
      (change, index) => `### ${index + 1}. ${change.title}

**Context:** ${change.context}

**Before**
\`\`\`ts
${change.before}
\`\`\`

**After**
\`\`\`ts
${change.after}
\`\`\`

**Outcome:** ${change.outcome}
`
    )
    .join("\n");

  return `# ${data.title}

${data.subtitle}

- Generated on: ${data.generatedOn}
- Repository root: ${data.repositoryRoot}

## 1. Project Understanding

### Purpose

${data.projectPurpose}

### How the system currently works

${renderBulletList(data.currentFlow)}

### Tech stack

${renderBulletList(data.techStack)}

### Main modules

${renderBulletList(data.modules)}

## 2. Deep Code Review

${findings}

## 3. Error Fixing

${codeChanges}

## 4. Functional Improvements Implemented

### UI/UX

${renderBulletList(data.uiUxImprovements)}

### Backend Logic

${renderBulletList(data.backendImprovements)}

### Database and Query Layer

${renderBulletList(data.databaseImprovements)}

### API Structure

${renderBulletList(data.apiImprovements)}

## 5. Feature Enhancements Implemented

${renderBulletList(data.featureEnhancements)}

## 6. Performance Optimization

${renderBulletList(data.performanceOptimizations)}

### Important Database Indexes

${renderBulletList(data.databaseIndexes)}

## 7. Code Structure Improvement

${renderBulletList(data.structureImprovements)}

## 8. Final Summary

### Issues Found

${renderBulletList(data.findings.map((finding) => `${finding.severity}: ${finding.title}`))}

### Fixes Applied

${renderBulletList(data.fixesApplied)}

### Improvements Made

${renderBulletList([
  ...data.uiUxImprovements.slice(0, 2),
  ...data.backendImprovements.slice(0, 2),
  ...data.featureEnhancements,
])}

### Verification Completed

${renderBulletList(data.verification)}

### Suggested Next Steps

${renderBulletList(data.nextSteps)}
`;
}

export function renderReviewHtml(data: ReviewDocumentData) {
  const findings = data.findings
    .map(
      (finding, index) => `
        <section class="card">
          <h3>${index + 1}. ${escapeHtml(finding.title)}</h3>
          <p><strong>Severity:</strong> ${escapeHtml(finding.severity)}</p>
          <p><strong>Problem:</strong> ${escapeHtml(finding.problem)}</p>
          <p><strong>Why it matters:</strong> ${escapeHtml(finding.whyItMatters)}</p>
          <p><strong>Resolution:</strong> ${escapeHtml(finding.resolution)}</p>
          <p><strong>Impacted files:</strong> ${escapeHtml(finding.impactedFiles.join(", "))}</p>
        </section>
      `
    )
    .join("");

  const codeChanges = data.codeChanges
    .map(
      (change, index) => `
        <section class="card">
          <h3>${index + 1}. ${escapeHtml(change.title)}</h3>
          <p><strong>Context:</strong> ${escapeHtml(change.context)}</p>
          <div class="code-grid">
            <div>
              <h4>Before</h4>
              <pre>${escapeHtml(change.before)}</pre>
            </div>
            <div>
              <h4>After</h4>
              <pre>${escapeHtml(change.after)}</pre>
            </div>
          </div>
          <p><strong>Outcome:</strong> ${escapeHtml(change.outcome)}</p>
        </section>
      `
    )
    .join("");

  const list = (items: string[]) =>
    `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(data.title)}</title>
    <style>
      :root {
        --bg: #f3f6fb;
        --card: #ffffff;
        --text: #142033;
        --muted: #4f5d75;
        --line: #d6deeb;
        --accent: #0b63f6;
        --ink-soft: #eef4ff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        font-family: Arial, Helvetica, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.55;
      }
      header {
        background: linear-gradient(135deg, #0f172a, #0b63f6);
        color: white;
        padding: 28px 32px;
        border-radius: 18px;
        margin-bottom: 24px;
      }
      header p { margin: 6px 0 0; color: rgba(255,255,255,0.86); }
      h1, h2, h3, h4 { margin: 0 0 12px; }
      h2 { margin-top: 28px; font-size: 24px; }
      .meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 18px;
      }
      .meta div {
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 12px;
        padding: 12px 14px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 18px 20px;
        margin: 14px 0;
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
      }
      .section {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 22px 24px;
        margin-top: 18px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }
      .code-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin: 14px 0;
      }
      pre {
        margin: 0;
        padding: 14px;
        border-radius: 12px;
        background: #0f172a;
        color: #e2e8f0;
        overflow: hidden;
        white-space: pre-wrap;
        font-family: "Courier New", monospace;
        font-size: 12px;
      }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 6px 0; }
      .tag {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--ink-soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      @media print {
        body { padding: 18px; }
        .section, .card, header { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <header>
      <span class="tag">Engineering Review</span>
      <h1>${escapeHtml(data.title)}</h1>
      <p>${escapeHtml(data.subtitle)}</p>
      <div class="meta">
        <div><strong>Generated on</strong><br />${escapeHtml(data.generatedOn)}</div>
        <div><strong>Repository root</strong><br />${escapeHtml(data.repositoryRoot)}</div>
      </div>
    </header>

    <section class="section">
      <h2>1. Project Understanding</h2>
      <p>${escapeHtml(data.projectPurpose)}</p>
      <div class="grid">
        <div class="card">
          <h3>Current System Flow</h3>
          ${list(data.currentFlow)}
        </div>
        <div class="card">
          <h3>Tech Stack</h3>
          ${list(data.techStack)}
        </div>
      </div>
      <div class="card">
        <h3>Main Modules</h3>
        ${list(data.modules)}
      </div>
    </section>

    <section class="section">
      <h2>2. Deep Code Review</h2>
      ${findings}
    </section>

    <section class="section">
      <h2>3. Error Fixing</h2>
      ${codeChanges}
    </section>

    <section class="section">
      <h2>4. Functional Improvements Implemented</h2>
      <div class="grid">
        <div class="card">
          <h3>UI/UX</h3>
          ${list(data.uiUxImprovements)}
        </div>
        <div class="card">
          <h3>Backend Logic</h3>
          ${list(data.backendImprovements)}
        </div>
        <div class="card">
          <h3>Database</h3>
          ${list(data.databaseImprovements)}
        </div>
        <div class="card">
          <h3>API Structure</h3>
          ${list(data.apiImprovements)}
        </div>
      </div>
    </section>

    <section class="section">
      <h2>5. Feature Enhancements Implemented</h2>
      ${list(data.featureEnhancements)}
    </section>

    <section class="section">
      <h2>6. Performance Optimization</h2>
      ${list(data.performanceOptimizations)}
      <div class="card">
        <h3>Important Database Indexes</h3>
        ${list(data.databaseIndexes)}
      </div>
    </section>

    <section class="section">
      <h2>7. Code Structure Improvement</h2>
      ${list(data.structureImprovements)}
    </section>

    <section class="section">
      <h2>8. Final Summary</h2>
      <div class="grid">
        <div class="card">
          <h3>Fixes Applied</h3>
          ${list(data.fixesApplied)}
        </div>
        <div class="card">
          <h3>Verification Completed</h3>
          ${list(data.verification)}
        </div>
      </div>
      <div class="card">
        <h3>Suggested Next Steps</h3>
        ${list(data.nextSteps)}
      </div>
    </section>
  </body>
</html>`;
}
