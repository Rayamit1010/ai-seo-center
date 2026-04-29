# API Overview

## Authentication

- `POST /api/auth/[...nextauth]`
- `POST /api/register`

## AI and Chat

- `GET /api/chat`
  Returns saved chat sessions or a single session by `sessionId`.
- `POST /api/chat`
  Starts a streamed SEO chat response with project memory plus optional live GSC/GA4 context.
- `POST /api/chat/compare`
  Runs the same prompt across multiple providers with the same project and analytics context.
- `GET /api/agent/config`
  Returns agent and provider configuration.
- `PUT /api/agent/config`
  Updates agent settings, provider models, and encrypted API keys.
- `GET /api/ai/analytics`
  Returns persisted AI telemetry analytics.
- `GET /api/agent/stats`
  Returns backlink pipeline KPIs plus provider health.

## Agent

- `GET /api/agent/campaigns`
- `POST /api/agent/campaigns`
- `GET /api/agent/campaigns/[id]`
- `PATCH /api/agent/campaigns/[id]`
- `DELETE /api/agent/campaigns/[id]`
- `GET /api/agent/runs`
- `GET /api/agent/heartbeat`
  Returns passive agent status for the UI.
- `POST /api/agent/heartbeat`
  Triggers a manual agent cycle safely.

## Audits and Reports

- `GET /api/audit`
- `POST /api/audit`
- `GET /api/audit/[id]`
- `DELETE /api/audit/[id]`
- `GET /api/reports`
- `GET /api/reports/workspace`
  Returns the full reports workspace payload in one request for the reports dashboard.
- `POST /api/reports`
- `PATCH /api/reports`
- `DELETE /api/reports?id=...`
- `GET /api/reports/schedules`
- `POST /api/reports/schedules`
- `PATCH /api/reports/schedules`
- `DELETE /api/reports/schedules?id=...`
- `POST /api/reports/send`
- `GET /api/reports/deliveries`

## Projects

- `GET /api/projects`
- `POST /api/projects`
  Creates a per-website profile with strategy memory plus Search Console, GA4, and CMS settings.
- `GET /api/projects/[id]`
- `PATCH /api/projects/[id]`
- `DELETE /api/projects/[id]`
- `GET /api/projects/[id]/connections`
  Checks Search Console, GA4, and CMS integration readiness for a project profile.

## Content and Publishing

- `POST /api/content`
  Runs content analysis, meta generation, or schema generation.
- `POST /api/content/publish`
  Publishes HTML content to the selected project's WordPress or webhook CMS target.

## Utility and Monitoring

- `GET /api/notifications`
- `GET /api/ops/overview`
- `POST /api/scrape`
- `POST /api/pagespeed`

## Response Pattern

Most private APIs use:

```json
{
  "success": true,
  "data": {}
}
```

Error responses typically use:

```json
{
  "error": "Technical message",
  "reason": "Human-friendly explanation"
}
```
