import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useSettings, type Lang } from '../lib/settings'
import vi from './vi.json'

// Vietnamese (default + fallback) ships in the main bundle; English is a lazy chunk.
const loaders: Record<Exclude<Lang, 'vi'>, () => Promise<{ default: object }>> = {
  en: () => import('./en.json'),
}

async function ensureLang(lang: Lang) {
  if (lang === 'vi' || i18n.hasResourceBundle(lang, 'translation')) return
  i18n.addResourceBundle(lang, 'translation', (await loaders[lang]()).default)
}

async function applyLang(lang: Lang) {
  await ensureLang(lang).catch(() => {}) // offline + not precached → stays on the vi fallback
  await i18n.changeLanguage(lang)
  document.documentElement.lang = lang
}

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi } },
  lng: 'vi',
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
})

/** Resolves once the saved language is loaded — render after this to avoid a vi → en flash. */
export const i18nReady = applyLang(useSettings.getState().lang)

useSettings.subscribe((s, prev) => {
  if (s.lang !== prev.lang) void applyLang(s.lang)
})

export default i18n
