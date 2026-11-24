import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Loader, Send, Share } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/shared/settings'
import { currentSubscription, disableReminder, enableReminder, pushSupport, saveReminder, sendTest } from './push'

const SUB_KEY = ['push-subscription']

/** Settings card: daily reminder on/off, time, "send a test". */
export function ReminderSettings() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { reminderTime, lang, set } = useSettings()
  const support = pushSupport()
  const { data: sub, isLoading } = useQuery({ queryKey: SUB_KEY, queryFn: currentSubscription, enabled: support === 'ok', staleTime: 0 })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const on = !!sub

  const run = async (fn: () => Promise<void>, okMsg?: string) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      if (okMsg) setMsg(okMsg)
    } catch (e) {
      const code = (e as Error).message
      setMsg(code === 'denied' ? t('reminder.denied') : code === 'dismissed' ? t('reminder.dismissed') : code.endsWith('429') ? t('reminder.tooSoon') : t('reminder.error'))
    } finally {
      setBusy(false)
      await qc.invalidateQueries({ queryKey: SUB_KEY })
    }
  }

  // keep the server's language in step with the app's
  useEffect(() => {
    if (sub && navigator.onLine) void saveReminder(sub, reminderTime, lang).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  if (support !== 'ok')
    return (
      <Card>
        <p className="text-sm text-muted">
          {support === 'install-first' ? (
            <>
              <Share size={14} className="mr-1 inline" />
              {t('reminder.installFirst')}
            </>
          ) : (
            t('reminder.unsupported')
          )}
        </p>
      </Card>
    )

  const offline = !navigator.onLine
  return (
    <Card>
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span>
          <span className="block font-medium">{t('reminder.toggle')}</span>
          <span className="block text-xs text-muted">{on ? t('reminder.onHint', { time: reminderTime }) : t('reminder.offHint')}</span>
        </span>
        {busy || isLoading ? (
          <Loader size={22} className="animate-spin text-leaf-600" />
        ) : (
          <input
            type="checkbox"
            role="switch"
            checked={on}
            disabled={offline}
            onChange={(e) => (e.target.checked ? run(() => enableReminder(reminderTime, lang), t('reminder.enabled')) : run(disableReminder))}
            className="size-6 shrink-0 accent-leaf-500"
          />
        )}
      </label>

      {on && (
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 text-sm">
            {t('reminder.time')}
            <input
              type="time"
              value={reminderTime}
              disabled={busy || offline}
              onChange={(e) => {
                const time = e.target.value
                if (!time) return
                set({ reminderTime: time })
                void run(() => saveReminder(sub!, time, lang))
              }}
              className="min-h-11 rounded-xl border border-line bg-surface px-3 text-base"
            />
          </label>
          <button
            disabled={busy || offline}
            onClick={() => run(sendTest, t('reminder.testSent'))}
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-leaf-100 px-3 text-sm font-semibold text-leaf-700 disabled:opacity-50"
          >
            <Send size={16} /> {t('reminder.test')}
          </button>
        </div>
      )}
      {offline && <p className="text-xs text-muted">{t('offline.needOnline')}</p>}
      {msg && (
        <p role="status" className="text-sm text-leaf-700">
          {msg}
        </p>
      )}
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-label={t('reminder.title')}>
      <h2 className="flex items-center gap-2 font-semibold">
        <BellRing size={18} className="text-leaf-600" /> {t('reminder.title')}
      </h2>
      {children}
    </section>
  )
}
