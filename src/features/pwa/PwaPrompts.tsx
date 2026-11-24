import clsx from 'clsx'
import { Share, X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useSettings } from '@/shared/settings'

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
    const id = setTimeout(() => setOfflineReady(false), 3000)
    return () => clearTimeout(id)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null
  return (
    <div
      role="status"
      className={clsx(
        'above-nav animate-slide-up fixed z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-leaf-800 text-white shadow-lg',
        // the update prompt needs a button; "offline ready" is a small pill that doesn't cover the content
        needRefresh ? 'inset-x-3 p-3' : 'inset-x-0 w-fit px-4 py-2',
      )}
    >
      <span className="flex-1 text-sm font-medium">{needRefresh ? t('update.available') : t('update.offlineReady')}</span>
      {needRefresh && (
        <button onClick={() => updateServiceWorker(true)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-leaf-700">
          {t('update.reload')}
        </button>
      )}
      {needRefresh && (
        <button aria-label={t('common.close')} onClick={() => (setNeedRefresh(false), setOfflineReady(false))} className="p-1">
          <X size={18} />
        </button>
      )}
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
