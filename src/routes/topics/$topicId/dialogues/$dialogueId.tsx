import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import clsx from 'clsx'
import { Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/shared/ui/Layout'
import { play, playSequence, useAudioState } from '@/features/audio/audio'
import { topicQuery } from '@/features/content/content'
import { useSettings } from '@/shared/settings'
import { FeatureTour } from '@/features/tour/FeatureTour'

export const Route = createFileRoute('/topics/$topicId/dialogues/$dialogueId')({
  loader: async ({ context, params }) => {
    const topic = await context.queryClient.ensureQueryData(topicQuery(params.topicId))
    if (!topic.dialogues.some((d) => d.id === params.dialogueId)) throw notFound()
  },
  component: DialoguePage,
})

const SPEAKER_STYLE = {
  mom: 'bg-leaf-500',
  dad: 'bg-[#6aa9e9]',
  child: 'bg-peach',
} as const

function DialoguePage() {
  const { t } = useTranslation()
  const { topicId, dialogueId } = Route.useParams()
  const { lang, showIpa } = useSettings()
  const { data: topic } = useSuspenseQuery(topicQuery(topicId))
  const dialogue = topic.dialogues.find((d) => d.id === dialogueId)!
  const { current: playing, sequenceId } = useAudioState()
  const isPlayingAll = sequenceId === dialogue.id
  const title = lang === 'vi' ? dialogue.titleVi : dialogue.titleEn

  return (
    <>
      <PageHeader
        back
        title={title}
        subtitle={lang === 'vi' ? topic.titleVi : topic.titleEn}
      />
      <main className="space-y-3 px-4">
        {dialogue.lines.map((line, i) => {
          const isChild = line.speaker === 'child'
          return (
            <div key={line.id} data-tour={i === 0 ? 'dialogue-line' : undefined} className={clsx('flex items-end gap-2', isChild && 'flex-row-reverse')}>
              <span className={clsx('grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white', SPEAKER_STYLE[line.speaker])}>
                {t(`dialogue.${line.speaker}`)}
              </span>
              <button
                onClick={() => play(line.audio)}
                className={clsx(
                  'max-w-[80%] rounded-3xl border px-4 py-3 text-left shadow-sm',
                  isChild ? 'rounded-br-md border-peach/40 bg-peach/10' : 'rounded-bl-md border-line bg-surface',
                  playing === line.audio && 'is-playing',
                )}
              >
                <span lang="en" className="block text-lg font-semibold">{line.en}</span>
                {showIpa && <span className="block font-mono text-xs text-muted">{line.ipa}</span>}
                <span className="block text-sm text-muted">{line.vi}</span>
              </button>
            </div>
          )
        })}
      </main>

      {!isPlayingAll && (
      <div className="fixed inset-x-0 bottom-24 z-10 flex justify-center">
        <button
          onClick={() => playSequence(dialogue.id, dialogue.lines.map((l) => ({ key: l.audio, title: l.en })), { gapMs: 500, label: title })}
          data-tour="dialogue-play"
          className="flex items-center gap-2 rounded-full bg-leaf-600 px-6 py-3 font-bold text-white shadow-lg active:scale-95"
        >
          <Play size={20} />
          {t('dialogue.playAll')}
        </button>
      </div>
      )}
      <FeatureTour id="dialogue" />
    </>
  )
}
