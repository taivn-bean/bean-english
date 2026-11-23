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
