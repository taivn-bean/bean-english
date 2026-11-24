import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTourActive } from './tourState'
import { findTarget, TOURS, type TourId } from './tours'

type Box = { top: number; left: number; width: number; height: number }
const PAD = 6 // spotlight padding around the element
const GAP = 16 // min space between the element and the card / screen top
const MOVE_MS = 320 // spotlight glide between steps
const TOP = 'max(env(safe-area-inset-top), 0.75rem)'
const BOTTOM = 'calc(env(safe-area-inset-bottom) + 4.75rem)' // above the bottom nav

/** Element (or an ancestor) is fixed/sticky → scrolling won't move it. */
function isPinned(el: HTMLElement | null) {
  for (; el && el !== document.body; el = el.parentElement) {
    const pos = getComputedStyle(el).position
    if (pos === 'fixed' || pos === 'sticky') return true
  }
  return false
}

const ease = (k: number) => 1 - (1 - k) ** 3

/** Lowest edge of the sticky bars (page header, topic tabs) once they're stuck at the top. */
function stickyBottom() {
  let edge = 12
  for (const el of document.querySelectorAll<HTMLElement>('.sticky')) {
    const top = parseFloat(getComputedStyle(el).top)
    if (Number.isFinite(top)) edge = Math.max(edge, top + el.offsetHeight)
  }
  return edge
}

/**
 * Spotlight tour. Layout rules that keep it calm while stepping through:
 *  • the card stays docked at the bottom (same place, same size → "Next" never moves); the page is
 *    scrolled so the element sits in the free space above the card. Only an element that can't be
 *    scrolled out of the way (fixed at the bottom) sends the card to the top.
 *  • the card is as tall as its longest step (all steps are stacked in one grid cell).
 *  • the spotlight glides from the previous element to the new one while following the scroll,
 *    driven per frame on the DOM (no CSS transition fighting the scroll, no React re-render).
 * `onClose(seen)`: seen = finished or skipped (false only if nothing on the page could be shown).
 */
export default function TourOverlay({ id, onClose }: { id: TourId; onClose: (seen: boolean) => void }) {
  const { t } = useTranslation()
  // targets present when the tour starts (optional steps missing on this page are dropped)
  const [steps] = useState(() => TOURS[id].filter((target) => findTarget(target)))
  const [i, setI] = useState(0)
  const holeRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const drawn = useRef<Box | null>(null)
  const bottomGap = useRef<number | null>(null)
  const target = steps[i]
  const last = i === steps.length - 1

  useLayoutEffect(() => {
    useTourActive.setState({ active: true })
    // Temporary room at the end of the page, so elements near the bottom of a short page can
    // still be scrolled above the docked card (instead of moving the card to the top).
    const root = document.documentElement
    const prev = root.style.paddingBottom
    root.style.paddingBottom = `${cardRef.current?.offsetHeight ?? 0}px`
    return () => {
      root.style.paddingBottom = prev
      useTourActive.setState({ active: false })
    }
  }, [])

  useEffect(() => {
    if (!steps.length) onClose(false)
    // ran past the end because the last target vanished
    else if (i >= steps.length) onClose(true)
  }, [i, steps.length, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(true)
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  useLayoutEffect(() => {
    if (!target) return
    const el = findTarget(target)
    const dock = dockRef.current
    const card = cardRef.current
    const hole = holeRef.current
    if (!dock || !card || !hole) return
    if (!el) {
      // element went away (e.g. list re-rendered): skip it
      const skip = requestAnimationFrame(() => setI((n) => n + 1))
      return () => cancelAnimationFrame(skip)
    }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const vh = innerHeight

    // Where the card's top edge is when docked at the bottom.
    if (bottomGap.current == null) {
      dock.style.top = ''
      dock.style.bottom = BOTTOM
      bottomGap.current = vh - card.getBoundingClientRect().bottom
    }
    const freeTop = stickyBottom() + GAP
    const freeBottom = vh - bottomGap.current - card.offsetHeight - GAP

    // Scroll so the element is centred in the free space above the card (or its top shows, if tall).
    const r = el.getBoundingClientRect()
    let dy = 0
    if (!isPinned(el)) {
      const room = freeBottom - freeTop
      const want = r.height <= room ? freeTop + (room - r.height) / 2 : freeTop
      const maxScroll = document.documentElement.scrollHeight - vh
      dy = Math.max(-scrollY, Math.min(maxScroll - scrollY, r.top - want))
      if (Math.abs(dy) > 1) scrollBy({ top: dy, behavior: reduce ? 'auto' : 'smooth' })
    }
    // Decide the card's place from where the element will end up, once per step (no flip-flopping).
    const endBottom = r.bottom - dy
    const onTop = endBottom > freeBottom + GAP && r.top - dy > vh / 2
    dock.style.top = onTop ? TOP : ''
    dock.style.bottom = onTop ? '' : BOTTOM

    // Spotlight: glide from the previous box to the element's live box, then keep following it.
    const from = drawn.current
    const start = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const live = el.getBoundingClientRect()
      const k = !from || reduce ? 1 : ease(Math.min(1, (now - start) / MOVE_MS))
      const mix = (a: number, b: number) => a + (b - a) * k
      const box = from
        ? { top: mix(from.top, live.top), left: mix(from.left, live.left), width: mix(from.width, live.width), height: mix(from.height, live.height) }
        : { top: live.top, left: live.left, width: live.width, height: live.height }
      drawn.current = box
      // padded and clamped to the viewport, so a tall element doesn't push the shadow off-screen
      const top = Math.max(box.top - PAD, 4)
      const left = Math.max(box.left - PAD, 4)
      const bottom = Math.min(box.top + box.height + PAD, innerHeight - 4)
      const right = Math.min(box.left + box.width + PAD, innerWidth - 4)
      hole.style.transform = `translate(${left}px, ${top}px)`
      hole.style.width = `${Math.max(0, right - left)}px`
      hole.style.height = `${Math.max(0, bottom - top)}px`
      hole.style.opacity = '1'
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    nextRef.current?.focus({ preventScroll: true })
    return () => cancelAnimationFrame(raf)
  }, [target])

  if (!target) return null

  return (
    <div className="fixed inset-0 z-[60] touch-none" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      <div
        ref={holeRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 rounded-2xl opacity-0 ring-2 ring-white/80 will-change-transform"
        style={{ boxShadow: '0 0 0 200vmax rgb(20 30 20 / 0.6)' }}
      />

      <div ref={dockRef} className="absolute inset-x-0 mx-auto max-w-xl px-4">
        <div ref={cardRef} className="animate-slide-up space-y-3 rounded-3xl bg-surface p-4 shadow-xl">
          <div className="flex items-start gap-2">
            {/* every step stacked in one cell: the card keeps the height of the longest one */}
            <div className="grid min-w-0 flex-1" aria-live="polite">
              {steps.map((s, n) => (
                <div
                  key={s}
                  aria-hidden={n !== i}
                  className={clsx('col-start-1 row-start-1 space-y-1 motion-safe:transition-opacity motion-safe:duration-200', n !== i && 'pointer-events-none opacity-0')}
                >
                  <p className="text-xs font-semibold text-leaf-600">{t('tour.step', { n: n + 1, total: steps.length })}</p>
                  <h2 id={n === i ? 'tour-title' : undefined} className="text-lg leading-tight font-bold">
                    {t(`tour.${id}.${s}.title`)}
                  </h2>
                  <p id={n === i ? 'tour-body' : undefined} className="text-[15px] leading-snug text-muted">
                    {t(`tour.${id}.${s}.body`)}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={() => onClose(true)} aria-label={t('tour.skip')} className="-mt-1 -mr-1 grid size-10 shrink-0 place-items-center rounded-full text-muted active:bg-leaf-100">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex flex-1 gap-1.5" aria-hidden>
              {steps.map((s, n) => (
                <span key={s} className={clsx('h-1.5 rounded-full motion-safe:transition-all', n === i ? 'w-5 bg-leaf-500' : 'w-1.5 bg-leaf-200')} />
              ))}
            </span>
            <button
              onClick={() => setI(i - 1)}
              className={clsx('min-h-11 rounded-full px-4 font-semibold text-leaf-700 active:bg-leaf-100', i === 0 && 'invisible')}
            >
              {t('tour.back')}
            </button>
            <button
              ref={nextRef}
              onClick={() => (last ? onClose(true) : setI(i + 1))}
              className="min-h-11 min-w-28 rounded-full bg-leaf-500 px-5 font-semibold text-white active:bg-leaf-600"
            >
              {last ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
