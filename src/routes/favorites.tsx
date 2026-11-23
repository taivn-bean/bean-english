import { useQueries, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/Layout'
import { PhraseCard } from '../components/PhraseCard'
import { useFavorites, useProgressMap } from '../hooks/useProfile'
import { contentIndexQuery, topicQuery } from '../lib/content'

export const Route = createFileRoute('/favorites')({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentIndexQuery),
  component: FavoritesPage,
})

function FavoritesPage() {
  const { t } = useTranslation()
  const favorites = useFavorites()
  const progress = useProgressMap()
  const { data: index } = useSuspenseQuery(contentIndexQuery)

  // Only load topics that actually contain favorites.
  const topicIds = [...new Set(favorites.map((f) => f.topicId))].filter((id) => index.topics.some((tp) => tp.id === id))
  const topics = useQueries({ queries: topicIds.map((id) => topicQuery(id)) })
  const phrases = new Map(topics.flatMap((q) => q.data?.phrases.map((p) => [p.id, p] as const) ?? []))

  return (
    <>
      <PageHeader title={t('favorites.title')} />
      <main className="space-y-3 px-4">
        {favorites.length === 0 && <p className="rounded-3xl bg-leaf-50 p-6 text-center text-muted">{t('favorites.empty')}</p>}
        {favorites.map((f) => {
          const phrase = phrases.get(f.phraseId)
          return phrase ? (
            <PhraseCard key={f.phraseId} phrase={phrase} topicId={f.topicId} progress={progress.get(f.phraseId)} favorite />
          ) : null
        })}
      </main>
    </>
  )
}
