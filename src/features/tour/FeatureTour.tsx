import { lazy, Suspense, useEffect, useState } from 'react'
import { useSettings } from '@/shared/settings'
import { markTourSeen } from './tourState'
import { findTarget, TOURS, type TourId } from './tours'

// The overlay is only downloaded when a tour actually has to be shown (still precached for offline).
const TourOverlay = lazy(() => import('./TourOverlay'))

/**
 * Drop into a page: the first time the page is opened, waits until the page has rendered at least
 * one of the tour's targets, then shows the tour. Finished or skipped → never again
 * (until "show tips again" in Settings).
 */
export function FeatureTour({ id }: { id: TourId }) {
  const seen = useSettings((s) => s.toursSeen.includes(id))
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (seen) return
    let tries = 0
    // let the page settle (data, layout, splash) before looking for targets
    const timer = setInterval(() => {
      if (TOURS[id].some(findTarget)) {
        clearInterval(timer)
        setShow(true)
      } else if (++tries > 30) clearInterval(timer)
    }, 400)
    return () => clearInterval(timer)
  }, [id, seen])

  if (seen || !show) return null
  return (
    <Suspense fallback={null}>
      <TourOverlay id={id} onClose={(completed) => (completed ? markTourSeen(id) : setShow(false))} />
    </Suspense>
  )
}
