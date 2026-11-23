import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { ChevronRight, MessagesSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { PageHeader } from '../../../components/Layout'
import { PhraseCard } from '../../../components/PhraseCard'
import { PlayAllButton } from '../../../components/PlaylistBar'
import { useFavorites, useProgressMap } from '../../../hooks/useProfile'
import { topicQuery, toPlaylist } from '../../../lib/content'
import { useSettings } from '../../../lib/settings'

export const Route = createFileRoute('/topics/$topicId/')({
  validateSearch: z.object({ tab: z.enum(['phrases', 'dialogues']).optional().catch(undefined) }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(topicQuery(params.topicId)),
  component: TopicPage,
})

function TopicPage() {
  const { t } = useTranslation()
  const { topicId } = Route.useParams()
  const tab = Route.useSearch().tab ?? 'phrases'
  const lang = useSettings((s) => s.lang)
  const { data: topic } = useSuspenseQuery(topicQuery(topicId))
  const progress = useProgressMap(topicId)
  const favorites = useFavorites()
  const favIds = new Set(favorites.map((f) => f.phraseId))

  return (
    <>
      <PageHeader
        back
        title={lang === 'vi' ? topic.titleVi : topic.titleEn}
        subtitle={lang === 'vi' ? topic.titleEn : topic.titleVi}
        right={<PlayAllButton id={`topic:${topicId}`} label={lang === 'vi' ? topic.titleVi : topic.titleEn} items={toPlaylist(topic.phrases)} />}
      />

      <div className="sticky top-[calc(max(env(safe-area-inset-top),0.75rem)+3.5rem)] z-10 bg-bg/90 px-4 pb-3 backdrop-blur">
        <div className="grid grid-cols-2 rounded-full bg-leaf-100 p-1" role="tablist">
          {(['phrases', 'dialogues'] as const).map((key) => (
            <Link
              key={key}
              to="."
              search={{ tab: key }}
              replace
              role="tab"
              aria-selected={tab === key}
              className={clsx('rounded-full py-2 text-center text-sm font-semibold', tab === key ? 'bg-surface text-leaf-700 shadow-sm' : 'text-muted')}
            >
              {t(`topic.${key}`)}
            </Link>
          ))}
        </div>
      </div>

      <main className="space-y-3 px-4">
        {tab === 'phrases'
          ? topic.phrases.map((p) => (
              <PhraseCard key={p.id} phrase={p} topicId={topicId} progress={progress.get(p.id)} favorite={favIds.has(p.id)} />
            ))
          : topic.dialogues.map((d) => (
              <Link
                key={d.id}
                to="/topics/$topicId/dialogues/$dialogueId"
                params={{ topicId, dialogueId: d.id }}
                className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-sm"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-leaf-100 text-leaf-700">
                  <MessagesSquare size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{lang === 'vi' ? d.titleVi : d.titleEn}</span>
                  <span className="block text-sm text-muted">
                    {lang === 'vi' ? d.titleEn : d.titleVi} · {t('topic.lines', { count: d.lines.length })}
                  </span>
                </span>
                <ChevronRight className="text-muted" />
              </Link>
            ))}
      </main>
    </>
  )
}
