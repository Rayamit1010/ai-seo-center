# Software Requirements Specification

## 1. Purpose

SEO Command Center is a multi-tenant-style SEO operations platform for managing audits, content strategy, backlink acquisition, AI-assisted workflows, and reporting across multiple websites from one dashboard.

The product is intended to behave like an AI-augmented SEO operating system rather than a single-purpose audit tool.

## 2. Goals

- Drive organic growth and conversions through automation-first SEO workflows
- Manage multiple websites with isolated strategy context
- Support operator workflows and client-facing delivery from the same system
- Use multiple AI providers with fallback and health-aware routing
- Maintain safe, white-hat backlink and content operations

## 3. In Scope

- user authentication and protected dashboard
- AI chat with multi-provider routing and compare mode
- project memory per managed website
- audit generation and analysis storage
- backlink pipeline automation
- recurring report generation and delivery
- AI telemetry, ops visibility, and queue-backed background jobs

## 4. Out of Scope

- direct rank-tracker synchronization
- direct payment/billing workflows
- enterprise RBAC / multi-operator permissions
- provider-managed workflow orchestration such as Temporal or Vercel Workflow

These may be added later, but they are not fully implemented in the current repository state.

## 5. User Roles

### 5.1 Platform Operator

Primary internal user managing websites, campaigns, AI providers, automations, and reports.

### 5.2 Client Recipient

External stakeholder who receives reports by email or via exported/shareable output.

### 5.3 Background Worker

System actor that processes queued jobs such as audit processing, report schedules, report email sends, and autonomous agent cycles.

## 6. Functional Requirements

### FR-1 Authentication

- The system shall require authentication for protected dashboard pages and private APIs.
- The system shall support credential-based sign-in via NextAuth.

### FR-2 Multi-Website Project Memory

- The system shall allow the operator to create, update, delete, and mark default website profiles.
- Each website profile shall store brand voice, business goals, services, conversion goals, backlink rules, content playbook, niche playbook, and notes.
- Each website profile shall optionally store Search Console, GA4, and CMS publishing connection settings.
- The AI system shall resolve the most relevant website profile for user prompts and automation tasks.

### FR-3 AI Chat

- The system shall allow users to chat with an SEO copilot.
- The system shall support smart routing and provider-specific routing.
- The system shall support compare mode across multiple AI providers.
- The system shall fall back to another configured AI provider when the preferred provider fails and fallback is enabled.

### FR-4 AI Provider Management

- The system shall allow storage of AI provider keys and model settings in user configuration.
- The system shall support Claude, ChatGPT, Gemini, Grok, and Groq.
- The system shall track provider telemetry including attempts, failures, failovers, and latency.

### FR-5 Audit Management

- The system shall create audits from URL or pasted HTML.
- The system shall store audit results including summary, scores, on-page, technical, off-page, keywords, and checklist data.
- The system shall expose audit results to reports and dashboard flows.

### FR-6 Backlink Agent

- The system shall manage backlink campaigns per website.
- The system shall discover prospects, qualify them, find contacts, draft outreach, and queue/send emails.
- The system shall maintain stages and logs for prospects and agent runs.
- The system shall expose backlink KPIs including links, reply rate, conversion rate, quality score, and risk indicators.

### FR-7 Reporting

- The system shall generate saved reports from completed audits.
- The system shall support client-oriented delivery metadata such as client name, project name, branding, recipient email, and delivery status.
- The system shall allow email sending, HTML export, and recurring schedules.
- The system shall support daily, weekly, and monthly report schedules.

### FR-8 Owner Digest / Internal Reporting

- The system shall support recurring owner-facing reporting schedules.
- The daily digest shall summarize websites managed, backlink progress, content/reporting activity, technical focus, and next-step actions based on available system data.
- If live email delivery is not configured, the system shall still allow draft schedule creation without crashing.

### FR-9 External Data and Publishing Integrations

- The system shall accept Search Console property mapping per website profile.
- The system shall accept GA4 property mapping per website profile.
- The system shall allow direct publishing to WordPress or a generic webhook CMS target.
- Integration failures shall be surfaced in human-readable language without crashing the workflow.

### FR-10 Ops and Monitoring

- The system shall expose queue state, job outcomes, AI health, and recent incidents in the Ops Center.
- The system shall present human-readable failure reasons when jobs or APIs fail.

### FR-11 Background Processing

- The system shall support queue-based processing for audits, report schedules, report email sends, and agent cycles.
- The system shall work in database-backed, local-memory, and Redis-backed queue modes.

## 7. Non-Functional Requirements

### NFR-1 Security

- Secrets shall be encrypted before database persistence.
- Protected APIs shall enforce authenticated access.
- Error messages shown to the user shall avoid leaking sensitive implementation details.

### NFR-2 Scalability

- The queue layer shall support durable retries, leasing, and dead-letter handling.
- The queue layer shall support a future/shared queue implementation via Redis or another workflow system.
- The system shall isolate user data and website context logically.
- Database indexes shall exist for frequent audit, report, campaign, and telemetry query paths.

### NFR-3 Reliability

- Background jobs shall log success/failure outcomes.
- The AI router shall support cooldowns and provider failover.
- The UI shall show human-readable failure states instead of silent failures.

### NFR-4 Maintainability

- Shared server helpers shall centralize auth and response behavior.
- Services shall own domain logic instead of crowding route handlers.
- Documentation shall be sufficient for onboarding and future extension.
- Regression coverage shall exist for critical browser flows and schedule math.

### NFR-5 Performance

- The app shall use optimized App Router rendering patterns for dashboard pages.
- The system shall avoid unnecessary client-side duplication of server work.
- High-frequency list and telemetry queries shall use indexed columns.
- Heavy dashboard APIs shall expose timing data to make slow-path investigation easier.

## 8. Assumptions

- One authenticated platform operator account may manage multiple websites.
- The local default database may be SQLite, though the repository is now Postgres-ready for production workflows.
- External providers such as AI vendors, Google APIs, CMS endpoints, and Resend may be unavailable at times and must be handled gracefully.

## 9. Constraints

- Current authentication is based on NextAuth credential flow.
- Current email delivery depends on `RESEND_API_KEY`.
- Current automation processing depends on either in-process queue execution or explicit worker draining via `pnpm jobs:drain`.
- Windows local development may require stopping the dev server before `prisma generate`.

## 10. Acceptance Criteria

- A user can sign in and access protected dashboard pages.
- A user can configure AI providers and run AI chat with fallback.
- A user can create project memory entries and see them influence AI/chat behavior.
- A user can run audits and generate saved reports.
- A user can connect Search Console, GA4, or CMS settings to a project profile without breaking validation.
- A user can create backlink campaigns and observe stage-based pipeline progression.
- A user can create recurring report schedules including daily cadence.
- Background jobs can be drained successfully.
- Lint, typecheck, and build pass successfully.
