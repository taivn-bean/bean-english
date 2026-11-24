import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DeckGrid, ReviewButton } from '@/features/cards/CardsSection'
import { PageHeader } from '@/shared/ui/Layout'
import { useCardStats } from '@/features/cards/useCards'
import { useAgeFilter } from '@/features/profile/useProfile'
import { AGE_BANDS, contentIndexQuery } from '@/features/content/content'
import { FeatureTour } from '@/features/tour/FeatureTour'

export const Route = createFileRoute('/cards/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(contentIndexQuery),
  component: DecksPage,
})

/** All vocabulary decks for the child's age band, grouped by the youngest band they start at. */
function DecksPage() {
  const { t } = useTranslation()
  const { data: index } = useSuspenseQuery(contentIndexQuery)
  const { fits } = useAgeFilter()
  const stats = useCardStats()
  const decks = index.decks.filter((d) => fits(d.ages))
  return (
    <>
      <PageHeader title={t('cards.title')} subtitle={t('cards.learnedTotal', { count: stats.learned })} />
      <main className="space-y-5 px-4">
        <div data-tour="cards-review">
          <ReviewButton due={stats.due} hasCards={stats.total > 0} />
        </div>
        {AGE_BANDS.map((b) => {
          const list = decks.filter((d) => d.ages[0] === b)
          if (!list.length) return null
          return (
            <section key={b} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted">{t(`age.band.${b}`)}</h2>
              <DeckGrid decks={list} />
            </section>
          )
        })}
      </main>
      <FeatureTour id="cards" />
    </>
  )
}
