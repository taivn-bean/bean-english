import clsx from 'clsx'
import { useRef, useState, type PointerEvent, type ReactNode } from 'react'

/** Horizontal drag (px) that counts as a swipe answer. */
const SWIPE_AT = 90

type Props = {
  flipped: boolean
  onFlip: () => void
  /** Called once the user swipes a flipped card: right = known, left = not yet. Runs inside the gesture (audio may start). */
  onSwipe: (known: boolean) => void
  front: ReactNode
  back: ReactNode
  labels: { flip: string; flipBack: string; known: string; again: string }
}

/**
 * Flash-card with a 3D flip (tap) and, once flipped, swipe right/left to answer.
 * `touch-action: pan-y` keeps vertical scrolling of a long back side working.
 */
export function SwipeCard({ flipped, onFlip, onSwipe, front, back, labels }: Props) {
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)

  const down = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY }
    dragged.current = false
  }
  const move = (e: PointerEvent) => {
    if (!start.current || !flipped) return
    const x = e.clientX - start.current.x
    const y = e.clientY - start.current.y
    if (Math.abs(x) > 8 && Math.abs(x) > Math.abs(y)) dragged.current = true
    if (dragged.current) setDx(x)
  }
  const up = () => {
    if (flipped && Math.abs(dx) >= SWIPE_AT) onSwipe(dx > 0)
    start.current = null
    setDx(0)
  }

  const hint = Math.min(1, Math.abs(dx) / SWIPE_AT)
  const face = 'flex min-h-[52dvh] flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-leaf-200 bg-surface p-5 text-center shadow-sm [backface-visibility:hidden] [grid-area:1/1]'

  return (
    <div className="animate-card-in [perspective:1200px]">
      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? labels.flipBack : labels.flip}
        onClick={() => !dragged.current && onFlip()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onFlip())}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={clsx('relative touch-pan-y select-none', !dx && 'transition-transform duration-200')}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)` }}
      >
        <div
          className={clsx(
            'grid transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none',
            flipped && '[transform:rotateY(180deg)]',
          )}
        >
          <div className={face} inert={flipped} aria-hidden={flipped}>
            {front}
          </div>
          <div className={clsx(face, '[transform:rotateY(180deg)]')} inert={!flipped} aria-hidden={!flipped}>
            {back}
          </div>
        </div>
        {dx !== 0 && (
          <span
            className={clsx(
              'pointer-events-none absolute top-5 rounded-xl border-4 px-3 py-1 text-xl font-extrabold uppercase',
              dx > 0 ? 'left-5 -rotate-12 border-leaf-500 text-leaf-600' : 'right-5 rotate-12 border-peach text-peach',
            )}
            style={{ opacity: hint }}
          >
            {dx > 0 ? labels.known : labels.again}
          </span>
        )}
      </div>
    </div>
  )
}
