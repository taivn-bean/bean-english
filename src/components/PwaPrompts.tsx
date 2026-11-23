import { Share, X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useSettings } from '../lib/settings'

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** "New content" banner (never auto-reloads mid-lesson) + one-time "offline ready" toast. */
export function UpdateBanner() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // check for new content hourly while the app is open
      if (reg) setInterval(() => navigator.onLine && reg.update(), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    const id = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(id)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null
  return (
    <div className="fixed inset-x-3 bottom-24 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-leaf-700 p-3 text-white shadow-lg">
      <span className="flex-1 text-sm font-medium">{needRefresh ? t('update.available') : t('update.offlineReady')}</span>
      {needRefresh && (
        <button onClick={() => updateServiceWorker(true)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-leaf-700">
          {t('update.reload')}
        </button>
      )}
      <button aria-label="close" onClick={() => (setNeedRefresh(false), setOfflineReady(false))} className="p-1">
        <X size={18} />
      </button>
    </div>
  )
}

export function InstallHint({ force = false }: { force?: boolean }) {
  const { t } = useTranslation()
  const { installHintDismissed, set } = useSettings()
  if (isStandalone() || (!force && (installHintDismissed || !isIos()))) return null
  return (
    <div className="rounded-3xl border border-leaf-200 bg-leaf-50 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Share size={18} /> {t('install.title')}
      </p>
      <p className="mt-1 text-sm text-muted">{t('install.steps')}</p>
      {!force && (
        <button onClick={() => set({ installHintDismissed: true })} className="mt-2 text-sm font-semibold text-leaf-600">
          {t('install.dismiss')}
        </button>
      )}
    </div>
  )
}
