import { createFileRoute, Link } from '@tanstack/react-router'
import { MessageCircleHeart, Share2, Volume2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/Layout'
import { useTopics } from '../hooks/useContent'
import { useActiveProfile, useDiary } from '../hooks/useProfile'
import { play } from '../lib/audio'
import { phraseAudio, type Phrase } from '../lib/content'
import { db, type Progress } from '../lib/db'
import { useSettings } from '../lib/settings'

export const Route = createFileRoute('/diary')({ component: DiaryPage })

const when = (p: Progress) => p.childSaidAt ?? p.updatedAt

function DiaryPage() {
  const { t } = useTranslation()
  const lang = useSettings((s) => s.lang)
  const profile = useActiveProfile()
  const entries = useDiary()
  const { topics } = useTopics([...new Set(entries.map((e) => e.topicId))])
  const phrases = new Map(topics.flatMap((tp) => tp.phrases.map((p) => [p.id, p] as const)))

  const dateFmt = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  const groups = new Map<string, Progress[]>()
  for (const e of entries) {
    const key = dateFmt.format(when(e))
    groups.set(key, [...(groups.get(key) ?? []), e])
  }

  const share = async () => {
    const lines = entries.slice(0, 20).flatMap((e) => {
      const p = phrases.get(e.phraseId)
      return p ? [`• ${p.en} — ${p.vi}${e.note ? ` (${e.note})` : ''}`] : []
    })
    const text = `${t('diary.shareTitle', { name: profile?.name ?? '' })}\n${lines.join('\n')}`
    try {
      if (navigator.share) await navigator.share({ text })
      else await navigator.clipboard.writeText(text)
    } catch {
      /* cancelled */
    }
  }

  return (
    <>
      <PageHeader
        back
        title={t('diary.title')}
        subtitle={t('diary.count', { count: entries.length, name: profile?.name ?? '' })}
        right={
          entries.length > 0 && (
            <button onClick={share} aria-label={t('diary.share')} className="grid size-11 place-items-center rounded-full bg-leaf-100 text-leaf-700">
              <Share2 size={20} />
            </button>
          )
        }
      />
      <main className="space-y-5 px-4">
        {entries.length === 0 && (
          <div className="rounded-3xl bg-leaf-50 p-6 text-center text-muted">
            <MessageCircleHeart className="mx-auto mb-2 text-peach" size={32} />
            {t('diary.empty')}
            <Link to="/" className="mt-3 block font-semibold text-leaf-600">
              {t('nav.topics')} →
            </Link>
          </div>
        )}
        {[...groups].map(([date, items]) => (
          <section key={date} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted">{date}</h2>
            <ol className="space-y-2 border-l-2 border-peach/40 pl-4">
              {items.map((e) => (
                <DiaryEntry key={e.phraseId} entry={e} phrase={phrases.get(e.phraseId)} />
              ))}
            </ol>
          </section>
        ))}
      </main>
    </>
  )
}

function DiaryEntry({ entry, phrase }: { entry: Progress; phrase?: Phrase }) {
  const { t } = useTranslation()
  if (!phrase) return null
  const key = phraseAudio(phrase)
  return (
    <li className="relative rounded-2xl border border-line bg-surface p-3">
      <span className="absolute top-4 -left-[1.4rem] size-3 rounded-full bg-peach" />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p lang="en" className="font-semibold">{phrase.slots ? phrase.slots[0].fullEn : phrase.en}</p>
          <p className="text-sm text-muted">{phrase.slots ? phrase.slots[0].fullVi : phrase.vi}</p>
        </div>
        {key && (
          <button onClick={() => play(key)} aria-label={t('topic.tapToHear')} className="grid size-10 shrink-0 place-items-center rounded-full bg-leaf-500 text-white">
            <Volume2 size={18} />
          </button>
        )}
      </div>
      <input
        defaultValue={entry.note ?? ''}
        placeholder={t('diary.notePlaceholder')}
        maxLength={120}
        onBlur={(e) => {
          const note = e.target.value.trim()
          if (note !== (entry.note ?? '')) db.progress.update([entry.profileId, entry.phraseId], { note: note || undefined })
        }}
        className="mt-2 w-full rounded-xl bg-leaf-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-leaf-400"
      />
    </li>
  )
}
