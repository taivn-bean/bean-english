---
name: pwa-offline-react
description: Architecture and implementation guide for a full-offline React + Vite + TypeScript PWA that installs on iPhone via Safari Add to Home Screen — vite-plugin-pwa/Workbox precaching (including audio), update flow, IndexedDB storage, routing, iOS meta tags and audio playback quirks. Use when scaffolding the app, touching the service worker/manifest/caching, or debugging offline behavior.
---

# Offline-first React PWA (iOS-focused)

## Stack
- Vite + React + TypeScript, `react-router` (createBrowserRouter) — SW `navigateFallback: 'index.html'` handles deep links offline.
- `vite-plugin-pwa` (`registerType: 'prompt'`), Workbox `generateSW`.
- Storage: `idb-keyval` (tiny) or Dexie if queries are needed. Zod for content validation.
- Styling: plain CSS modules or Tailwind — no runtime CSS-in-JS, no remote fonts (self-host via `@fontsource/*`).

## vite.config.ts essentials
```ts
VitePWA({
  registerType: 'prompt',
  includeAssets: ['icons/*.png', 'apple-touch-icon.png'],
  manifest: {
    name: 'Bean English', short_name: 'Bean', lang: 'vi',
    display: 'standalone', start_url: '/', scope: '/',
    background_color: '#FFF8EC', theme_color: '#FFF8EC',
    icons: [ /* 192, 512, 512 maskable */ ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,json,svg,png,ico,woff2}'], // no audio here — see below
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
  },
})
```
- Precache = app shell + content JSON only. Audio = immutable packs (see content-schema § Audio) the user downloads per topic via `src/lib/offline.ts` into Cache `bean-audio-v1`; playback reads cache first, then network. Show per-topic status ("Chưa tải offline" tag) and the /offline page.

## iOS specifics
- In `index.html`: `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` (180×180, no transparency), `viewport-fit=cover` and use `env(safe-area-inset-*)`.
- iOS has no install prompt: show an in-app "Thêm vào màn hình chính" guide when `!navigator.standalone` on iOS Safari.
- Call `navigator.storage.persist()` after install; show storage estimate in Settings.
- Storage can still be evicted → on startup verify a sentinel set of cached URLs; if missing and online, re-cache; if offline, show a clear message.
- Home-screen app and Safari tab have **separate** storage; tell users to open from the icon.

## Audio playback
- Use a single reusable `HTMLAudioElement` (not Web Audio) — respects iOS behavior better and works with silent-switch rules more predictably.
- First play must happen inside a user tap handler. Preload next/prev clip with `audio.preload = 'auto'` only on tap-adjacent items.
- Playback rate for "slow" mode: prefer separate `.slow` files; `playbackRate = 0.75` + `preservesPitch` as fallback.
- If available, set `navigator.audioSession.type = 'playback'` (Safari 16.4+), guarded by feature check.
- Fallback when a file is missing: `speechSynthesis` with an `en-US` voice (works offline with on-device voices, but quality varies).

## Update flow
- `useRegisterSW` → when `needRefresh`, show a non-blocking banner "Có nội dung mới — Cập nhật". Never auto-reload mid-lesson.

## Project layout
```
src/
  app/ (router, providers)   features/topics, features/dialogue, features/favorites, features/settings
  content/ (json)            lib/audio.ts, lib/storage.ts, lib/content.ts (zod)
public/audio/<id>.m4a
```

## Done checklist
- [ ] `npm run build && npm run preview` → DevTools > Application: SW active, all audio in precache
- [ ] Offline (DevTools offline) → reload, deep-link to a topic, play audio: all work
- [ ] Lighthouse PWA installable, no console errors
