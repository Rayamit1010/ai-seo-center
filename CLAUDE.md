# AI SEO Center — Claude Code Notes

## Deploying to Vercel Production

The project is linked via `.vercel/project.json`:
- **Project ID:** `prj_5pywSc7ojXs0neIfR119dqNljU90`
- **Team/Org ID:** `team_hFlEurltbgRjLS0mfqBMHspL`
- **Production URL:** `https://seoagent.techgeekstudio.com`

### Option 1 — Git integration (automatic, no token needed)
Merge any branch into `main` on GitHub. Vercel auto-builds and deploys to production.
```
git push origin main   # or merge a PR via GitHub
```

### Option 2 — Vercel CLI from this sandbox (requires token)
The sandbox cannot reach `vercel.com` to log in interactively. To deploy directly:

1. Generate a token at **vercel.com → Settings → Tokens**
2. Add it to the project env (`.claude/settings.local.json` or shell rc):
   ```json
   { "env": { "VERCEL_TOKEN": "your_token_here" } }
   ```
3. Then run:
   ```bash
   VERCEL_TOKEN=your_token vercel deploy --prod
   ```

### Post-deploy checklist
- [ ] Set `ADMIN_EMAILS=admin@techgeekstudio.com` in Vercel env vars (Settings → Environment Variables)
- [ ] Verify `NEXTAUTH_SECRET` is set in Vercel env vars
- [ ] Run `prisma db seed` once on production DB to promote the admin account:
  ```bash
  DATABASE_URL=<prod-url> npx prisma db seed
  ```

## Superadmin account
- **Email:** `admin@techgeekstudio.com`
- Bypasses all subscription/quota checks when `role = "admin"` in DB **or** `ADMIN_EMAILS` env var includes this email
- Seed script (`prisma/seed.ts`) idempotently promotes the account on every run

## Prisma migration baseline (tracked in issue #4)

The build currently runs `prisma db push --accept-data-loss` because production
was provisioned with `db push` and has no migration-history baseline — `prisma
migrate deploy` fails with P3005 against it. The `--accept-data-loss` flag means
any destructive schema diff is silently auto-applied on every deploy.

`prisma/migrations/` already has 8 migration directories matching the current
schema; they just were never recorded as applied in production. To fix this
permanently, **with a fresh production backup in hand**, run from a machine with
production `DATABASE_URL` access (the sandbox doesn't have it):

```bash
DATABASE_URL="<prod-url>" npm run db:baseline-prod
```

This runs `scripts/baseline-prod-migrations.sh`, which:
1. Diffs the live DB against `prisma/schema.prisma` — must be empty before continuing
2. Marks all 8 existing migrations as applied via `prisma migrate resolve --applied`
3. Confirms `prisma migrate status` reports the schema up to date

Only after that succeeds, switch `package.json`'s build script from
`prisma db push --accept-data-loss` to `prisma migrate deploy`, deploy, confirm
a clean build, and close issue #4.

### Procedure validated (2026-07-06)

The full baseline flow was rehearsed against a throwaway Postgres 16 provisioned
to the exact production state (schema created via `db push`, no `_prisma_migrations`
history). Confirmed, in order:

1. `prisma migrate deploy` against that DB fails with **P3005** — reproduces the
   production error exactly.
2. `prisma migrate diff --from-url <db> --to-schema-datamodel prisma/schema.prisma`
   is **empty** — the `db push` schema matches `prisma/schema.prisma` with no drift.
3. `prisma migrate resolve --applied <name>` for all 8 migrations succeeds.
4. `prisma migrate status` then reports **"Database schema is up to date!"**
5. `prisma migrate deploy` afterwards is a clean **no-op (exit 0)**.

So `npm run db:baseline-prod` is a known-good, de-risked operation — it only needs
the real production `DATABASE_URL` (retrievable from Vercel → Project Settings →
Environment Variables → Production → `DATABASE_URL`, "Reveal"; or from the database
provider's dashboard) plus a fresh backup taken first.

### Caveat: the migration history is not reproducible from an empty database

The 8 migrations are **incremental** (the first one is `ALTER TABLE "User" …`, not
`CREATE TABLE`). There is no `0_init` migration that creates the base tables, so
`prisma migrate deploy` against a *truly empty* database fails with
`relation "User" does not exist` (42P01). This is fine for the long-lived
production DB (baselining marks the incrementals applied on top of the existing
`db push` schema), but it means **fresh/preview databases must be provisioned with
`db push`, not `migrate deploy`**, until someone squashes the current schema into a
proper initial migration. A committed `prisma/migrations/migration_lock.toml`
(`provider = "postgresql"`) records the datasource provider for the migrate CLI.
