import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ProgressBar } from '../components/Layout'
import { InstallHint } from '../components/PwaPrompts'
import { TopicIcon } from '../components/TopicIcon'
import { useActiveProfile, useProgressMap } from '../hooks/useProfile'
import { contentIndexQuery } from '../lib/content'
import { useSettings } from '../lib/settings'

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentIndexQuery),
  component: Home,
})

function Home() {
  const { t } = useTranslation()
  const lang = useSettings((s) => s.lang)
  const { data } = useSuspenseQuery(contentIndexQuery)
  const profile = useActiveProfile()
  const progress = useProgressMap()

  return (
    <>
      <header className="pt-safe flex items-center gap-3 px-4 pb-2">
        <img src="/logo.svg" alt="" className="size-14 rounded-2xl" />
        <div className="min-w-0">
          <p className="text-sm text-muted">{t('app.name')}</p>
          <h1 className="text-xl leading-tight font-bold">{t('home.greeting', { name: profile?.name ?? t('common.defaultChild') })}</h1>
        </div>
      </header>

      <main className="space-y-4 px-4 pt-2">
        <InstallHint />
        <ul className="grid grid-cols-2 gap-3">
          {data.topics.map((topic) => {
            const learned = topic.phraseIds.filter((id) => progress.get(id)?.parentLearned).length
            return (
              <li key={topic.id}>
                <Link
                  to="/topics/$topicId"
                  params={{ topicId: topic.id }}
                  className="flex h-full flex-col gap-2 rounded-3xl border border-line bg-surface p-4 shadow-sm active:scale-[0.98]"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-leaf-100 text-leaf-700">
                    <TopicIcon name={topic.icon} size={26} />
                  </span>
                  <span className="text-base leading-tight font-bold">{lang === 'vi' ? topic.titleVi : topic.titleEn}</span>
                  <span lang={lang === 'vi' ? 'en' : 'vi'} className="-mt-1 text-xs text-muted">
                    {lang === 'vi' ? topic.titleEn : topic.titleVi}
                  </span>
                  <span className="mt-auto space-y-1">
                    <ProgressBar value={learned} total={topic.phraseIds.length} />
                    <span className="block text-xs text-muted">{t('home.learned', { count: learned, total: topic.phraseIds.length })}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </main>
    </>
  )
}
