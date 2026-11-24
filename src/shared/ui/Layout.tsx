import { Link, useRouter } from '@tanstack/react-router'
import { ChartNoAxesColumn, ChevronLeft, House, Layers, Settings, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function PageHeader({ title, subtitle, back, right }: { title: ReactNode; subtitle?: ReactNode; back?: boolean; right?: ReactNode }) {
  const router = useRouter()
  const { t } = useTranslation()
  return (
    <header className="pt-safe sticky top-0 z-10 bg-bg/90 px-4 pb-3 backdrop-blur">
      <div className="flex items-center gap-2">
        {back && (
          <button
            onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: '/' }))}
            aria-label={t('common.back')}
            className="-ml-2 grid size-11 place-items-center rounded-full text-leaf-700 active:bg-leaf-100"
          >
            <ChevronLeft size={28} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}

const tabs = [
  { to: '/', icon: House, label: 'nav.topics' },
  { to: '/cards', icon: Layers, label: 'nav.cards' },
  { to: '/favorites', icon: Star, label: 'nav.favorites' },
  { to: '/progress', icon: ChartNoAxesColumn, label: 'nav.progress' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
] as const

type TabPath = (typeof tabs)[number]['to']

/** `badges`: small count per tab (e.g. word cards due today), passed in by the root route. */
export function BottomNav({ badges = {} }: { badges?: Partial<Record<TabPath, number>> }) {
  const { t } = useTranslation()
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {tabs.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              aria-label={badges[to] ? `${t(label)} (${badges[to]})` : undefined}
              activeOptions={{ exact: to === '/' }}
              className="flex flex-col items-center gap-0.5 py-2 text-xs text-muted data-[status=active]:font-semibold data-[status=active]:text-leaf-600"
            >
              <span className="relative">
                <Icon size={24} />
                {!!badges[to] && (
                  <span className="absolute -top-1.5 left-4 min-w-5 rounded-full bg-peach px-1 text-center text-[10px] leading-5 font-bold text-white">
                    {badges[to]! > 99 ? '99+' : badges[to]}
                  </span>
                )}
              </span>
              {t(label)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ProgressBar({ value, total, color = 'bg-leaf-400' }: { value: number; total: number; color?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-leaf-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color} transition-[width]`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-h-[60dvh] place-items-center p-6 text-center">
      <div>
        <img src="/logo.svg" alt="" className="mx-auto size-24 opacity-70" />
        <p className="mt-4 font-semibold">{t('common.error')}</p>
        {message && <p className="mt-1 text-sm text-muted">{message}</p>}
        {onRetry && (
          <button onClick={onRetry} className="mt-4 rounded-full bg-leaf-500 px-5 py-2 font-semibold text-white">
            {t('common.retry')}
          </button>
        )}
      </div>
    </div>
  )
}
