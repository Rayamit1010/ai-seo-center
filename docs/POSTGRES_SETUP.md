# PostgreSQL Setup Guide

This app uses **PostgreSQL** in production. The recommended provider for Vercel deployments is [Neon.tech](https://neon.tech) (free tier available).

## 1. Create a free Neon database

1. Sign up at https://neon.tech
2. Create a new project → name it `seo-center`
3. From the dashboard, copy the **Connection string** (Pooled) as `DATABASE_URL` and the **Direct connection** as `DIRECT_URL`

The pooled URL includes `?pgbouncer=true` and is used by the app at runtime (serverless-friendly).  
The direct URL is used by Prisma migrations and seeding.

## 2. Configure environment variables

In your `.env.local` (local) or Vercel dashboard (production):

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-yyy.region.aws.neon.tech/seo_center?schema=public&pgbouncer=true&connect_timeout=15
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxx-yyy.region.aws.neon.tech/seo_center?schema=public
```

> Add both `DATABASE_URL` and `DIRECT_URL` to Vercel → Settings → Environment Variables.

## 3. Apply the database schema

```bash
# Apply all pending migrations to your Neon database
pnpm exec prisma migrate deploy

# Or for development (creates migration files):
pnpm exec prisma migrate dev --name init
```

## 4. Seed initial data

```bash
pnpm exec prisma db seed
```

This seeds the 3 subscription plans (Solo, Agency, White-Label) and the default admin user.

## 5. Generate Prisma client

```bash
pnpm exec prisma generate
```

This is run automatically during `pnpm build`.

## Connection pooling note for Vercel serverless

Vercel runs each API route in a separate serverless function that may cold-start frequently. Without connection pooling, you can exhaust PostgreSQL's connection limit quickly.

**Solution (already configured):**
- `DATABASE_URL` uses PgBouncer (via `pgbouncer=true`) — used by the app at runtime
- `DIRECT_URL` bypasses PgBouncer — used only by Prisma migrations

The `datasource` block in `prisma/schema.prisma` uses both:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Vercel deployment checklist

- [ ] `DATABASE_URL` set in Vercel environment variables
- [ ] `DIRECT_URL` set in Vercel environment variables
- [ ] `NEXTAUTH_SECRET` set (generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` set to your production URL
- [ ] Stripe/Razorpay/PayPal keys configured
- [ ] Run `prisma migrate deploy` against your Neon DB before first deployment
