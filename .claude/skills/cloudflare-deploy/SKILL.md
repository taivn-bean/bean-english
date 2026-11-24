---
name: cloudflare-deploy
description: Deploy the Bean English Vite/React PWA to Cloudflare as static assets (Workers static assets preferred, Pages acceptable) with wrangler — config, SPA fallback, correct cache headers for sw.js/index.html/manifest vs hashed assets, preview vs production deploys, custom domain, GitHub Actions. Use when setting up or running deployment or debugging stale-cache/update issues in production.
---

# Cloudflare deployment

## Option A (preferred): Workers static assets
`wrangler.jsonc`:
```jsonc
{
  "name": "bean-english",
  "compatibility_date": "2026-11-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```
Deploy: `npm run build && npx wrangler deploy` → `https://bean-english.<account>.workers.dev`.
Preview: `npx wrangler versions upload` (gets a preview URL without promoting).

## Option B: Pages
`npx wrangler pages deploy dist --project-name bean-english` (`--branch preview` for preview).
SPA fallback is automatic when there is no `404.html`.

## Headers — `public/_headers` (copied into dist)
```
/sw.js
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
  Content-Type: application/manifest+json
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/audio/*
  Cache-Control: public, max-age=604800
```
Why: a cached `sw.js` means users never receive updates.

## Auth
- Local: `npx wrangler login` (interactive, user does it).
- CI: GitHub secret `CLOUDFLARE_API_TOKEN` (+ `CLOUDFLARE_ACCOUNT_ID`), use `cloudflare/wrangler-action`.

## Safety
- Production deploy and custom-domain/DNS changes → ask the user first.
- HTTPS is required for service workers — always true on Cloudflare.

## Post-deploy verification
```bash
curl -sI https://<url>/sw.js | grep -i cache-control      # no-cache
curl -sI https://<url>/manifest.webmanifest                # 200
curl -s https://<url>/topics/bath-time | grep -o '<div id="root">'  # SPA fallback works
```


## Worker + D1 + Cron (daily reminders, D34)
- `wrangler.jsonc`: `main: worker/index.ts`, `assets.run_worker_first: ["/api/*"]` (static files never hit the Worker), `d1_databases` binding `DB` → `bean-push`, `triggers.crons: ["*/10 * * * *"]`, `vars.VAPID_PUBLIC_KEY` (also hard-coded in `src/features/reminders/push.ts` — keep in sync).
- Secret `VAPID_PRIVATE_KEY`: `wrangler secret put VAPID_PRIVATE_KEY` (local copy in `.dev.vars`, gitignored). Rotating the key pair invalidates every subscription (users re-enable the reminder).
- Schema changes: add `migrations/000N_*.sql`, then `wrangler d1 migrations apply bean-push --remote` before deploying code that needs it.
- Free-plan limits that matter: 50 outgoing fetches per cron run (code sends ≤ 40, the rest go 10 min later), 5 cron triggers per account, D1 5M reads/day.
- Local test: `wrangler d1 migrations apply bean-push --local`, `wrangler dev --test-scheduled`; to hit `/__scheduled` add it to `run_worker_first` in a temporary copy of the config. Crypto check: `pnpm test:push`.
