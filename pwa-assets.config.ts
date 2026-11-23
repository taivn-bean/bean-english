import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // iOS home-screen icons must not be transparent
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#dff1dc' } },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#dff1dc' } },
  },
  images: ['public/logo.svg'],
})
