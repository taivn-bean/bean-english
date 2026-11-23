import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useSettings } from '../lib/settings'
import en from './en.json'
import vi from './vi.json'

export const resources = { vi: { translation: vi }, en: { translation: en } } as const

i18n.use(initReactI18next).init({
  resources,
  lng: useSettings.getState().lang,
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
})

useSettings.subscribe((s, prev) => {
  if (s.lang !== prev.lang) {
    i18n.changeLanguage(s.lang)
    document.documentElement.lang = s.lang
  }
})
document.documentElement.lang = useSettings.getState().lang

export default i18n
