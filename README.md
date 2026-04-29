# AI SEO Center

AI SEO Center is an enterprise-style SEO operations platform built to automate technical SEO, AI-assisted strategy, backlink operations, client reporting, and multi-site growth workflows from one dashboard.

It is designed as a portfolio-grade product build that combines product UI, AI orchestration, automation pipelines, background jobs, reporting systems, and operations tooling in a single Next.js application.

## Live Demo

- App: [seoagent-techgeekstudio.vercel.app](https://seoagent-techgeekstudio.vercel.app)

## Highlights

- Multi-provider AI router with failover across Claude, ChatGPT, Gemini, Grok, and Groq
- AI SEO chat with smart routing and side-by-side compare mode
- Autonomous backlink agent with qualification, outreach drafting, and campaign tracking
- Per-website project memory for brand voice, backlink rules, competitors, and SEO goals
- Client-ready SEO reporting with delivery workflows and recurring schedules
- Ops center for queue health, incidents, provider telemetry, and runtime visibility
- CMS publishing, Search Console context, and GA4-aware reporting hooks

## Product Areas

- `Dashboard`: command-center overview for SEO and AI operations
- `AI Chat`: provider-aware SEO copilot with fallback and compare mode
- `Projects`: multi-site memory and strategy configuration
- `AI Agent`: backlink discovery, scoring, contact finding, drafting, and tracking
- `Reports`: client reports, owner digests, send flows, and schedules
- `Content`: publishing workflows and CMS integration points
- `Ops Center`: incidents, queue monitoring, job visibility, and AI health
- `AI Analytics`: provider latency, failover, usage, and reliability stats

## Tech Stack

- `Next.js 16` App Router
- `React 19`
- `TypeScript`
- `Prisma`
- `NextAuth`
- `Tailwind CSS`
- `SQLite` for local development
- Postgres-ready Prisma workflow for production
- `Resend` for email delivery
- Google integrations for Search Console and GA4 context

## Architecture Notes

This project is structured as a modular application rather than a simple page-based demo:

- `app/`: UI routes and API routes
- `components/`: reusable interface building blocks
- `lib/services/`: business logic and orchestration services
- `lib/agent/`: backlink automation engine
- `lib/prompts/`: AI prompt system and provider behavior layers
- `lib/server/`: queue, auth, response, security, and observability helpers
- `prisma/`: schema, seed, and database workflow
- `tests/`: unit and browser-level coverage
- `deploy/`: production deployment scripts, PM2, systemd, and Nginx setup

## Local Development

1. Install dependencies

```bash
pnpm install
```

2. Create your local environment file

```bash
cp .env.local.example .env.local
```

3. Sync the database

```bash
pnpm exec prisma db push
pnpm exec prisma generate
```

4. Start the app

```bash
pnpm dev
```

5. Optional: run background jobs in a second terminal

```bash
pnpm jobs:drain
```

## Production Workflow

This repository includes deployment-ready assets for a production environment:

- PM2 ecosystem config
- systemd service files
- Nginx reverse proxy config
- worker daemon scripts
- production deployment helper scripts

See the deployment guide:

- [Deployment Guide](docs/DEPLOYMENT.md)

## Key Environment Variables

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

## Quality Checks

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm test:browser
pnpm build
```

## Documentation

- [Documentation Index](docs/README.md)
- [Software Requirements Specification](docs/SRS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [ERD](docs/ERD.md)
- [Feature Catalog](docs/FEATURES.md)
- [API Overview](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Engineering Review Artifacts

- [Engineering Review (Markdown)](docs/reviews/seo-command-center-engineering-review-2026-04-09.md)
- [Engineering Review (PDF)](docs/reviews/seo-command-center-engineering-review-2026-04-09.pdf)
- [Engineering Review (DOCX)](docs/reviews/seo-command-center-engineering-review-2026-04-09.docx)
- [Engineering Review (PPTX)](docs/reviews/seo-command-center-engineering-review-2026-04-09.pptx)

## Notes

- The app supports local SQLite development and a Postgres-ready production workflow.
- Some integrations require external credentials before live data becomes available.
- Public demo deployments may use reduced background automation compared to a fully provisioned production environment.
