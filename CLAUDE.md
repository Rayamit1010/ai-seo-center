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
