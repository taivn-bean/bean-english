import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import MiniSearch from 'minisearch'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { PageHeader } from '../components/Layout'
import { PhraseCard } from '../components/PhraseCard'
import { useTopics } from '../hooks/useContent'
import { useAgeFilter, useFavorites, useProgressMap } from '../hooks/useProfile'
import type { Phrase, Topic } from '../lib/content'
import { useSettings } from '../lib/settings'

export const Route = createFileRoute('/search')({
  validateSearch: z.object({ q: z.string().optional().catch(undefined) }),
  component: SearchPage,
})

type Doc = { id: string; topicId: string; en: string; vi: string }

/** Lowercase + strip Vietnamese diacritics so "doi" matches "đói". */
const fold = (term: string) =>
  term.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase()

function buildIndex(topics: Topic[]) {
  const index = new MiniSearch<Doc>({
    fields: ['en', 'vi'],
    storeFields: ['topicId'],
    processTerm: (term) => fold(term) || null,
    // typo tolerance only for longer words, otherwise "doi" would also match "door"
    searchOptions: { prefix: true, fuzzy: (term) => (term.length >= 5 ? 0.2 : false), combineWith: 'AND', boost: { en: 1.2 } },
  })
  const phrases = new Map<string, { phrase: Phrase; topic: Topic }>()
  for (const topic of topics)
    for (const phrase of topic.phrases) {
      phrases.set(phrase.id, { phrase, topic })
      index.add({
        id: phrase.id,
        topicId: topic.id,
        // include every filled slot sentence so "milk" finds "Do you want some ___?"
        en: [phrase.en, ...(phrase.slots?.map((s) => s.fullEn) ?? [])].join(' \n '),
        vi: [phrase.vi, ...(phrase.slots?.map((s) => s.fullVi) ?? [])].join(' \n '),
      })
    }
  return { index, phrases }
}

function SearchPage() {
  const { t } = useTranslation()
  const lang = useSettings((s) => s.lang)
  const q = Route.useSearch().q ?? ''
  const navigate = useNavigate({ from: Route.fullPath })
  const { topics, isLoading } = useTopics()
  const progress = useProgressMap()
  const favIds = new Set(useFavorites().map((f) => f.phraseId))
  const { band, showAll } = useAgeFilter()

  const search = useMemo(() => (isLoading ? null : buildIndex(topics)), [isLoading, topics])
  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!search || !query) return []
    // Folding diacritics makes "doi" match đói/đợi/dội — rank phrases containing the exact typed words first.
    const words = (x: string) => x.toLowerCase().split(/[^\p{L}']+/u)
    const isExact = (text: string) => (query.includes(' ') ? text.toLowerCase().includes(query) : words(text).includes(query))
    const exact = (p: Phrase) => [p.en, p.vi, ...(p.slots?.flatMap((s) => [s.fullEn, s.fullVi]) ?? [])].some(isExact)
    const hits = search.index.search(query).flatMap((r) => {
      const hit = search.phrases.get(String(r.id))
      return hit && (showAll || hit.phrase.ages.includes(band)) ? [{ ...hit, score: r.score, exact: exact(hit.phrase) }] : []
    })
    // Typed with accents (e.g. "tắm") and there are exact matches → don't show tạm/tâm/tam.
    const typedAccents = fold(query) !== query
    const pool = typedAccents && hits.some((h) => h.exact) ? hits.filter((h) => h.exact) : hits
    return pool.sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score).slice(0, 60)
  }, [search, q, band, showAll])

  const setQ = (value: string) => navigate({ search: { q: value || undefined }, replace: true })

  return (
    <>
      <PageHeader back title={t('search.title')} />
      <div className="sticky top-[calc(max(env(safe-area-inset-top),0.75rem)+3.5rem)] z-10 bg-bg/90 px-4 pb-3 backdrop-blur">
        <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-3 focus-within:border-leaf-400">
          <Search size={20} className="shrink-0 text-muted" />
          <input
            autoFocus
            type="text"
            autoComplete="off"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="min-w-0 flex-1 bg-transparent text-base outline-none"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="clear" className="grid size-8 place-items-center text-muted">
              <X size={18} />
            </button>
          )}
        </label>
      </div>

      <main className="space-y-3 px-4">
        {!q.trim() && <p className="px-1 text-sm text-muted">{t('search.hint')}</p>}
        {q.trim() && search && (
          <p className="px-1 text-sm text-muted">{results.length ? t('search.results', { count: results.length }) : t('search.noResults', { q })}</p>
        )}
        {results.map(({ phrase, topic }) => (
          <div key={phrase.id} className="space-y-1">
            <Link to="/topics/$topicId" params={{ topicId: topic.id }} className="px-2 text-xs font-semibold text-leaf-600">
              {lang === 'vi' ? topic.titleVi : topic.titleEn}
            </Link>
            <PhraseCard phrase={phrase} topicId={topic.id} progress={progress.get(phrase.id)} favorite={favIds.has(phrase.id)} />
          </div>
        ))}
      </main>
    </>
  )
}
