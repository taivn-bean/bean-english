import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        // which topics to keep offline and src/lib/offline.ts stores those packs in its own cache.
        globPatterns: ['**/*.{js,css,html,json,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
