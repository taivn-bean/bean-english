import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { RotateCcw, Shuffle, ThumbsUp, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WordVisual } from '@/features/cards/WordVisual'
import { ErrorState, PageHeader, ProgressBar } from '@/shared/ui/Layout'
import { useDecks } from '@/features/cards/useCards'
import { useActiveProfile, useAgeFilter } from '@/features/profile/useProfile'
import { Avatar } from '@/features/profile/Avatar'
import { Confetti } from '@/features/cards/Celebration'
import { SwipeCard } from '@/features/cards/SwipeCard'
import { WordExamples } from '@/features/cards/WordExamples'
import { FeatureTour } from '@/features/tour/FeatureTour'
import { play, stop, usePlaying } from '@/features/audio/audio'
import { deckOf, deckQueue, dueCards, MAX_REVIEW, rateCard, retryIndex, shuffle } from '@/features/cards/cards'
import { deckQuery, type Deck, type Word } from '@/features/content/content'
import { db } from '@/shared/db'
import { useSettings } from '@/shared/settings'

export const Route = createFileRoute('/cards/study')({
  // plain validator: keeps zod out of the startup bundle
  validateSearch: (s: Record<string, unknown>): { deck?: string } => ({ deck: typeof s.deck === 'string' ? s.deck : undefined }),
  component: StudyPage,
})

/** Words wrongly answered come back at most this many times per session. */
const MAX_RETRIES = 2

function StudyPage() {
  const { t } = useTranslation()
  const { deck: deckId } = Route.useSearch()
  const profileId = useSettings((s) => s.activeProfileId)
  const lang = useSettings((s) => s.lang)
  const shuffled = useSettings((s) => s.shuffleCards)
  const setSettings = useSettings((s) => s.set)
  const { fits } = useAgeFilter()
  const { data: oneDeck, isError: deckError } = useQuery({ ...deckQuery(deckId ?? ''), enabled: !!deckId })

  // Build the queue once per session (it must not change while the child is answering).
  const [queue, setQueue] = useState<string[] | null>(null)
  useEffect(() => {
    if (profileId == null || queue || (deckId && !oneDeck)) return
    let cancelled = false
    void (async () => {
      let ids: string[]
      if (deckId && oneDeck) {
        const cards = new Map((await db.cards.where({ profileId, deckId }).toArray()).map((c) => [c.wordId, c]))
        ids = deckQueue(oneDeck.words, cards, fits, await dueCards(profileId, deckId), shuffled)
      } else {
        // most overdue first when there are more than MAX_REVIEW; then optionally mixed
        const due = (await dueCards(profileId)).sort((a, b) => a.due.localeCompare(b.due)).slice(0, MAX_REVIEW).map((c) => c.wordId)
        ids = shuffled ? shuffle(due) : due
      }
      if (!cancelled) setQueue(ids)
    })()
    return () => {
      cancelled = true
    }
    // the queue is built once per session; toggling shuffle later only reorders the remaining cards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, deckId, oneDeck, queue, fits])

  const deckIds = useMemo(() => [...new Set((queue ?? []).map(deckOf))], [queue])
  const { decks, isLoading, isError } = useDecks(deckIds)
  const words = useMemo(() => {
    const m = new Map<string, { word: Word; deck: Deck }>()
    for (const deck of decks.values()) for (const word of deck.words) m.set(word.id, { word, deck })
    return m
  }, [decks])

  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [retries, setRetries] = useState<Record<string, number>>({})
  const playing = usePlaying()
  useEffect(() => stop, []) // stop audio when leaving

  const title = deckId ? (oneDeck ? (lang === 'vi' ? oneDeck.titleVi : oneDeck.titleEn) : '') : t('cards.reviewToday')
  if (deckError || isError) return <ErrorState message={t('cards.loadError')} />
  if (!queue || (queue.length && isLoading)) return <PageHeader back title={title} />

  const current = queue[pos] ? words.get(queue[pos]) : undefined
  const done = pos >= queue.length

  const rate = (ok: boolean) => {
    if (!current || profileId == null) return
    void rateCard(profileId, current.word, current.deck.id, ok)
    const id = current.word.id
    let next = queue
    if (ok) setKnown((n) => n + 1)
    else if ((retries[id] ?? 0) < MAX_RETRIES) {
      next = [...queue]
      next.splice(retryIndex(pos, queue.length, shuffled), 0, id)
      setQueue(next)
      setRetries((r) => ({ ...r, [id]: (r[id] ?? 0) + 1 }))
    }
    setFlipped(false)
    setPos(pos + 1)
    // still inside the tap → iOS lets us play the next word right away
    const upcoming = next[pos + 1] && words.get(next[pos + 1])
    if (upcoming) void play(upcoming.word.audio)
    else stop()
  }

  const toggleShuffle = () => {
    const on = !shuffled
    setSettings({ shuffleCards: on })
    // mix only what's still ahead; the card on screen stays
    if (on) setQueue([...queue.slice(0, pos + 1), ...shuffle(queue.slice(pos + 1))])
  }

  return (
    <>
      <PageHeader
        back
        title={title}
        subtitle={done ? undefined : `${Math.min(pos + 1, queue.length)} / ${queue.length}`}
        right={
          !done && (
            <button
              onClick={toggleShuffle}
              aria-pressed={shuffled}
              aria-label={t('cards.shuffle')}
              data-tour="study-shuffle"
              title={t('cards.shuffle')}
              className={clsx(
                'grid size-11 place-items-center rounded-full',
                shuffled ? 'bg-leaf-500 text-white' : 'bg-leaf-100 text-leaf-700',
              )}
            >
              <Shuffle size={20} />
            </button>
          )
        }
      />
      <main className="space-y-4 px-4 pb-6">
        {!done && <ProgressBar value={pos} total={queue.length} />}

        {done || !current ? (
          <Finished total={new Set(queue).size} known={known} empty={!queue.length} deckId={deckId} />
        ) : (
          <>
            <div data-tour="study-card">
            <SwipeCard
              key={pos}
              flipped={flipped}
              onFlip={() => setFlipped((f) => !f)}
              onSwipe={rate}
              labels={{ flip: t('cards.flip'), flipBack: t('cards.flipBack'), known: t('cards.known'), again: t('cards.again') }}
              front={<Front word={current.word} icon={current.deck.icon} playing={playing === current.word.audio} />}
              back={<Back word={current.word} icon={current.deck.icon} playing={playing} />}
            />
            </div>

            {!flipped ? (
              <button
                onClick={() => setFlipped(true)}
                data-tour="study-flip"
                className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-leaf-100 text-lg font-semibold text-leaf-700"
              >
                {t('cards.flip')}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => rate(false)}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-peach/20 text-lg font-semibold text-peach active:bg-peach/30"
                >
                  <RotateCcw size={20} /> {t('cards.again')}
                </button>
                <button
                  onClick={() => rate(true)}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-leaf-500 text-lg font-semibold text-white active:brightness-90"
                >
                  <ThumbsUp size={20} /> {t('cards.known')}
                </button>
                <p className="col-span-2 text-center text-xs text-muted">{t('cards.swipeHint')}</p>
              </div>
            )}
          </>
        )}
      </main>
      {!done && <FeatureTour id="study" />}
    </>
  )
}

/** Front: picture + "listen" — the child hears the word and guesses. */
function Front({ word, icon, playing }: { word: Word; icon: string; playing: boolean }) {
  const { t } = useTranslation()
  return (
    <>
      <WordVisual emoji={word.emoji} icon={icon} size={120} />
      <button
        onClick={(e) => {
          e.stopPropagation()
          void play(word.audio)
        }}
        aria-label={t('cards.listen')}
        className={clsx('grid size-20 place-items-center rounded-full bg-leaf-500 text-white shadow-md active:brightness-90', playing && 'is-playing')}
      >
        <Volume2 size={40} />
      </button>
      <p className="text-sm text-muted">{t('cards.frontHint')}</p>
    </>
  )
}

/** Back: the word, meaning and 5 example sentences to say together. */
function Back({ word, icon, playing }: { word: Word; icon: string; playing: string | null }) {
  const showIpa = useSettings((s) => s.showIpa)
  const stopFlip = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }
  return (
    <div className="w-full space-y-4 text-left">
      <button onClick={stopFlip(() => void play(word.audio))} className={clsx('flex w-full items-center gap-3 rounded-2xl text-left', playing === word.audio && 'is-playing')}>
        <WordVisual emoji={word.emoji} icon={icon} size={56} />
        <span className="min-w-0 flex-1">
          <span lang="en" className="block text-3xl leading-tight font-bold">
            {word.en}
          </span>
          {showIpa && <span className="block font-mono text-sm text-muted">{word.ipa}</span>}
          <span className="block text-lg text-leaf-700">{word.vi}</span>
        </span>
        <Volume2 size={26} className="shrink-0 text-leaf-600" />
      </button>

      <WordExamples word={word} guard={stopFlip} />
    </div>
  )
}

function Finished({ total, known, empty, deckId }: { total: number; known: number; empty: boolean; deckId?: string }) {
  const { t } = useTranslation()
  const profile = useActiveProfile()
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-6 text-center">
      {!empty && <Confetti />}
      <div className="animate-bounce-in relative">
        <Avatar avatar={profile?.avatar} color={profile?.color} size={112} title={profile?.name} />
        {!empty && (
          <span className="absolute -top-2 -right-16 rounded-2xl rounded-bl-sm bg-peach px-3 py-1.5 text-sm font-bold text-white shadow">{t('cards.cheer')}</span>
        )}
      </div>
      <p className="text-xl font-bold">{empty ? t('cards.nothingToStudy') : t('cards.doneTitle')}</p>
      {!empty && <p className="text-muted">{t('cards.doneDesc', { total, known })}</p>}
      <div className="flex w-full flex-col gap-2">
        {deckId && (
          <Link to="/cards/$deckId" params={{ deckId }} className="flex min-h-12 items-center justify-center rounded-2xl bg-leaf-500 font-semibold text-white">
            {t('cards.backToDeck')}
          </Link>
        )}
        <Link to="/avatar" className="flex min-h-12 items-center justify-center rounded-2xl bg-leaf-100 font-semibold text-leaf-700">
          {t('cards.backToAvatar')}
        </Link>
      </div>
    </section>
  )
}
