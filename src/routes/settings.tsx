import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import clsx from 'clsx'
import { CircleHelp, Download, Upload } from 'lucide-react'
import { type ChangeEvent, type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/shared/ui/Layout'
import { OfflineStatus } from '@/features/offline/OfflineStatus'
import { InstallHint } from '@/features/pwa/PwaPrompts'
import { ProfileManager } from '@/features/profile/ProfileManager'
import { ReminderSettings } from '@/features/reminders/ReminderSettings'
import { exportBackup, parseBackup, restoreBackup } from '@/features/backup/backup'
import { contentIndexQuery } from '@/features/content/content'
import { useSettings } from '@/shared/settings'
import { FeatureTour } from '@/features/tour/FeatureTour'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

function SettingsPage() {
  const { t } = useTranslation()
  const s = useSettings()
  const { data: index } = useQuery(contentIndexQuery)

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <main className="space-y-5 px-4">
        <div id="profiles" className="scroll-mt-20" data-tour="settings-profiles">
          <ProfileManager />
        </div>

        <Field label={t('settings.language')}>
          <Segmented value={s.lang} onChange={(lang) => s.set({ lang })} options={[['vi', 'Tiếng Việt'], ['en', 'English']]} />
        </Field>

        <label className="flex min-h-12 items-center justify-between rounded-2xl border border-line bg-surface px-4">
          <span className="font-medium">{t('settings.showIpa')}</span>
          <input type="checkbox" checked={s.showIpa} onChange={(e) => s.set({ showIpa: e.target.checked })} className="size-6 accent-leaf-500" />
        </label>

        <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-2">
          <span>
            <span className="block font-medium">{t('age.showAll')}</span>
            <span className="block text-xs text-muted">{t('age.showAllHint')}</span>
          </span>
          <input type="checkbox" checked={s.showAllAges} onChange={(e) => s.set({ showAllAges: e.target.checked })} className="size-6 shrink-0 accent-leaf-500" />
        </label>

        <div data-tour="settings-reminder">
          <ReminderSettings />
        </div>

        <div data-tour="settings-offline">
          <Field label={t('settings.offline')}>
            <OfflineStatus />
            {index && <p className="px-1 text-xs text-muted">{t('settings.version')}: {index.contentVersion}</p>}
          </Field>
        </div>

        <div data-tour="settings-backup">
          <BackupSection />
        </div>

        <TourReplay />

        <InstallHint force />
      </main>
      <FeatureTour id="settings" />
    </>
  )
}

/** Show every feature's tour again (each one on its own page, next time it's opened). */
function TourReplay() {
  const { t } = useTranslation()
  const set = useSettings((s) => s.set)
  const [done, setDone] = useState(false)
  return (
    <div className="space-y-1" data-tour="settings-tour">
      <button
        onClick={() => {
          set({ toursSeen: ['settings'] })
          setDone(true)
        }}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 font-medium"
      >
        <CircleHelp size={22} className="text-leaf-600" /> {t('tour.replay')}
      </button>
      {done && (
        <p className="px-1 text-sm text-muted" role="status">
          {t('tour.replayDone')}
        </p>
      )}
    </div>
  )
}

function BackupSection() {
  const { t } = useTranslation()
  const [message, setMessage] = useState<string | null>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    try {
      const data = await parseBackup(file)
      if (!confirm(t('backup.importConfirm', { date: new Date(data.exportedAt).toLocaleString() }))) return
      await restoreBackup(data)
      setMessage(t('backup.imported'))
    } catch {
      setMessage(t('backup.invalid'))
    }
  }

  return (
    <Field label={t('backup.title')}>
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm text-muted">{t('backup.desc')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => exportBackup()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-leaf-500 px-3 text-sm font-semibold text-white">
            <Download size={18} /> {t('backup.export')}
          </button>
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-leaf-400 px-3 text-sm font-semibold text-leaf-700">
            <Upload size={18} /> {t('backup.import')}
            <input type="file" accept="application/json,.json" onChange={onFile} className="sr-only" />
          </label>
        </div>
        {message && <p className="text-sm font-medium" role="status">{message}</p>}
      </div>
    </Field>
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
