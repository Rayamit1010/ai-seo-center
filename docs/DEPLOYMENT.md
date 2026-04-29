# Deployment Guide

This project is production-ready for a Linux VPS or dedicated hosting environment that supports:

- Node.js 20+
- `corepack` / `pnpm`
- PostgreSQL
- Nginx
- either `PM2` or `systemd`

The frontend and backend run in the same Next.js process. The queue worker is a separate long-running process.

## 1. Files Added For Production

- [PM2 ecosystem](B:\AI SEO Agent\seo-command-center\deploy\ecosystem.config.cjs)
- [Deploy script](B:\AI SEO Agent\seo-command-center\deploy\deploy-production.sh)
- [Web wrapper](B:\AI SEO Agent\seo-command-center\deploy\run-web.sh)
- [Worker wrapper](B:\AI SEO Agent\seo-command-center\deploy\run-worker.sh)
- [Production env example](B:\AI SEO Agent\seo-command-center\deploy\env.production.example)
- [systemd web service](B:\AI SEO Agent\seo-command-center\deploy\systemd\seo-command-center-web.service)
- [systemd worker service](B:\AI SEO Agent\seo-command-center\deploy\systemd\seo-command-center-worker.service)
- [Nginx config](B:\AI SEO Agent\seo-command-center\deploy\nginx\seo-command-center.conf)

## 2. Recommended Production Layout

Example server path:

```bash
/var/www/seo-command-center
```

## 3. First-Time Server Setup

Install dependencies:

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
corepack enable
```

Clone or upload the project into `/var/www/seo-command-center`.

## 4. Configure Environment

Copy the production env template:

```bash
cd /var/www/seo-command-center
cp deploy/env.production.example .env.production
```

Fill in:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- all required AI provider keys
- `RESEND_API_KEY` and sender email values
- `GOOGLE_SERVICE_ACCOUNT_JSON` if using Google integrations

Important:

- keep `GOOGLE_SERVICE_ACCOUNT_JSON` on one line in `.env.production`
- do not paste multiline JSON blocks directly into a shell-style env file

Recommended production queue settings:

```env
JOB_QUEUE_PROVIDER="database"
JOB_QUEUE_REMOTE_ONLY="true"
JOB_WORKER_POLL_INTERVAL_MS="15000"
```

`JOB_QUEUE_REMOTE_ONLY="true"` is important in production because it keeps the web process from opportunistically draining jobs.

## 5. Make Scripts Executable

```bash
chmod +x deploy/*.sh
```

## 6. One-Command Deploy

Run:

```bash
./deploy/deploy-production.sh
```

What it does:

1. enables Corepack
2. installs dependencies with `pnpm`
3. syncs Prisma schema
4. runs lint and TypeScript checks
5. builds the Next.js app
6. reloads PM2 processes

If you want to skip lint/type checks on a hotfix deploy:

```bash
RUN_CHECKS=false ./deploy/deploy-production.sh
```

## 7. PM2 Setup

The deploy script expects `pm2` to be installed.

Manual PM2 start:

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

Managed processes:

- `seo-command-center-web`
- `seo-command-center-worker`

Useful commands:

```bash
pm2 status
pm2 logs seo-command-center-web
pm2 logs seo-command-center-worker
pm2 restart seo-command-center-web
pm2 restart seo-command-center-worker
```

## 8. systemd Alternative

If you prefer `systemd` instead of PM2:

1. copy the service files from `deploy/systemd/`
2. update the `User`, `Group`, and `WorkingDirectory`
3. install them:

```bash
sudo cp deploy/systemd/seo-command-center-web.service /etc/systemd/system/
sudo cp deploy/systemd/seo-command-center-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now seo-command-center-web
sudo systemctl enable --now seo-command-center-worker
```

## 9. Nginx Reverse Proxy

Use [seo-command-center.conf](B:\AI SEO Agent\seo-command-center\deploy\nginx\seo-command-center.conf) as the base config.

Install it:

```bash
sudo cp deploy/nginx/seo-command-center.conf /etc/nginx/sites-available/seo-command-center
sudo ln -s /etc/nginx/sites-available/seo-command-center /etc/nginx/sites-enabled/seo-command-center
sudo nginx -t
sudo systemctl reload nginx
```

Then issue SSL certificates:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seoagent.techgeekstudio.com
```

## 10. Production Health Checklist

After deploy, verify:

```bash
curl -I http://127.0.0.1:3000
pm2 status
pm2 logs seo-command-center-worker --lines 50
```

Then in browser:

- `/login`
- `/dashboard`
- `/agent`
- `/reports`
- `/ops`

## 11. Important Notes

- The worker is required for report schedules, automation, and queued jobs.
- Use PostgreSQL in production rather than SQLite.
- Keep `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` aligned with the public domain.
- Rotate any secrets that were ever pasted into chat or plain text.
