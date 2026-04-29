# SEO Command Center

Enterprise-style SEO operations platform built with Next.js App Router, Prisma, NextAuth, and a multi-provider AI router.

It combines:
- AI SEO chat with provider failover across Claude, ChatGPT, Gemini, Grok, and Groq
- autonomous backlink pipeline automation
- per-website strategy memory
- client and owner reporting
- queue-driven background jobs
- analytics, ops, and delivery tooling

## Product Areas

- `Dashboard`: overall SEO and AI operations summary
- `AI Chat`: multi-provider SEO copilot with smart routing and compare mode
- `Projects`: per-website memory for brand voice, backlink rules, and niche playbooks
- `AI Agent`: backlink discovery, qualification, contact finding, drafting, and delivery pipeline
- `Reports`: client-ready reports plus recurring owner/client schedules
- `Ops Center`: queue health, incidents, and provider/runtime visibility
- `AI Analytics`: provider telemetry and failover analytics

## Stack

- `Next.js 16` App Router
- `React 19`
- `TypeScript`
- `Prisma`
- `SQLite` by default in local dev, with Postgres-ready Prisma workflow for production
- `NextAuth`
- `Tailwind CSS`
- `Resend` for report email delivery
- multi-provider AI routing for `Claude`, `ChatGPT`, `Gemini`, `Grok`, and `Groq`

## Quick Start

1. Install dependencies

```bash
pnpm install
```

2. Configure environment variables

```bash
cp .env.local.example .env.local
```

3. Sync Prisma schema

```bash
pnpm exec prisma db push
pnpm exec prisma generate
```

For Postgres deployments:

```bash
pnpm db:push:postgres
pnpm db:generate:postgres
```

4. Run the app

```bash
pnpm dev
```

5. Optional: process queued jobs

```bash
pnpm jobs:drain
```

## Important Environment Variables

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `XAI_API_KEY`
- `GROQ_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `REPORTS_FROM_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `RATE_LIMIT_PROVIDER`
- `JOB_QUEUE_PROVIDER`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Background Processing

This project uses a queue abstraction in `lib/server/job-queue.ts`.

Supported patterns:
- database-backed durable queue for the default local and production-safe path
- local in-memory queue for development
- Upstash Redis REST-backed queue path for more scalable processing

Background jobs currently cover:
- audit processing
- report email sending
- recurring report schedules
- autonomous agent cycles

Recurring jobs now use database leases to prevent duplicate schedule sends and duplicate agent-cycle enqueues when multiple workers are active.

## Live Integrations

Project profiles can now store:
- `Search Console` property URLs
- `GA4` property IDs
- `WordPress` or generic `webhook` CMS publishing settings

Those integrations feed:
- live external context into AI chat and compare mode
- real traffic/search deltas into generated reports
- direct CMS publishing from the Content workspace

## Documentation

Detailed project docs live in [docs/README.md](B:\AI SEO Agent\seo-command-center\docs\README.md).

Main docs:
- [SRS](B:\AI SEO Agent\seo-command-center\docs\SRS.md)
- [Architecture](B:\AI SEO Agent\seo-command-center\docs\ARCHITECTURE.md)
- [ERD](B:\AI SEO Agent\seo-command-center\docs\ERD.md)
- [Feature Catalog](B:\AI SEO Agent\seo-command-center\docs\FEATURES.md)
- [API Overview](B:\AI SEO Agent\seo-command-center\docs\API.md)
- [Deployment Guide](B:\AI SEO Agent\seo-command-center\docs\DEPLOYMENT.md)

## Current Operational Notes

- AI provider keys can be stored in `AgentConfig` and are encrypted before persistence.
- The daily owner digest schedule can exist in `draft` mode if `RESEND_API_KEY` is not configured.
- Prisma generate on Windows can temporarily fail while the dev server is holding Prisma binaries open; stopping the dev server resolves that.

## Quality Checks

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```
