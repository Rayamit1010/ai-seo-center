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
