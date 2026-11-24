import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // "@/features/..." → src/features/... (keep in sync with tsconfig.app.json "paths")
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Bean English',
        short_name: 'Bean',
        description: 'Mẫu câu tiếng Anh cho ba mẹ nói cùng bé',
        lang: 'vi',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        background_color: '#f3faf2',
        theme_color: '#f3faf2',
      },
      workbox: {
        // Precache the app shell + all content JSON (small). Audio packs are NOT precached: the user picks
        // which topics to keep offline and src/features/offline/offline.ts stores those packs in its own cache.
        globPatterns: ['**/*.{js,css,html,json,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        // never answer the reminder API with the SPA shell
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // daily reminder notifications (Web Push) — see public/push-sw.js + worker/
        importScripts: ['push-sw.js'],
      },
      devOptions: { enabled: false },
    }),
  ],
})
