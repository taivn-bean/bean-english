import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import clsx from 'clsx'
import { CircleCheck, Loader } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/Layout'
import { InstallHint } from '../components/PwaPrompts'
import { play } from '../lib/audio'
import { contentIndexQuery } from '../lib/content'
import { useSettings } from '../lib/settings'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

const SAMPLE_AUDIO = { mom: 'wake-up-001.mom', dad: 'wake-up-001.dad' } as const

function SettingsPage() {
  const { t } = useTranslation()
  const s = useSettings()
  const { data: index } = useQuery(contentIndexQuery)
  const offline = useQuery({
    queryKey: ['offline-status'],
    queryFn: async () => {
      const ready = !!navigator.serviceWorker?.controller
      const est = await navigator.storage?.estimate?.()
      return { ready, used: est?.usage }
    },
    staleTime: 0,
    refetchInterval: (q) => (q.state.data?.ready ? false : 3000),
  })

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <main className="space-y-5 px-4">
        <Field label={t('settings.language')}>
          <Segmented value={s.lang} onChange={(lang) => s.set({ lang })} options={[['vi', 'Tiếng Việt'], ['en', 'English']]} />
        </Field>

        <Field label={t('settings.parentVoice')}>
          <Segmented
            value={s.parentVoice}
            onChange={(parentVoice) => {
              s.set({ parentVoice })
              play(SAMPLE_AUDIO[parentVoice])
            }}
            options={[['mom', t('settings.voiceMom')], ['dad', t('settings.voiceDad')]]}
          />
        </Field>

        <label className="flex min-h-12 items-center justify-between rounded-2xl border border-line bg-surface px-4">
          <span className="font-medium">{t('settings.showIpa')}</span>
          <input type="checkbox" checked={s.showIpa} onChange={(e) => s.set({ showIpa: e.target.checked })} className="size-6 accent-leaf-500" />
        </label>

        <Field label={t('settings.offline')}>
          <div className="space-y-1 rounded-2xl border border-line bg-surface p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              {offline.data?.ready ? <CircleCheck size={18} className="text-leaf-600" /> : <Loader size={18} className="animate-spin" />}
              {offline.data?.ready ? t('settings.offlineReady') : t('settings.offlineNotReady')}
            </p>
            {offline.data?.used != null && <p className="text-muted">{t('settings.storage', { used: `${(offline.data.used / 1024 / 1024).toFixed(1)} MB` })}</p>}
            {index && <p className="text-muted">{t('settings.version')}: {index.contentVersion}</p>}
          </div>
        </Field>

        <InstallHint force />
      </main>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted">{label}</h2>
      {children}
    </section>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="grid grid-cols-2 rounded-full bg-leaf-100 p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={clsx('min-h-11 rounded-full text-sm font-semibold', value === v ? 'bg-surface text-leaf-700 shadow-sm' : 'text-muted')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
