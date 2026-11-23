// Single shared HTMLAudioElement: most reliable on iOS (respects user-gesture rules, no Web Audio silent-switch issues).
import { useSyncExternalStore } from 'react'
import { audioUrl } from './content'

let el: HTMLAudioElement | null = null
let current: string | null = null
let sequenceToken = 0
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())
const setCurrent = (key: string | null) => {
  current = key
  emit()
}

function player() {
  if (!el) {
    el = new Audio()
    el.preload = 'auto'
    el.addEventListener('ended', () => setCurrent(null))
    el.addEventListener('error', () => setCurrent(null))
    // Safari 16.4+: play even when the ring/silent switch is on
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
  }
  return el
}

/** Play one clip. Resolves when it ends (or is interrupted). */
export function play(key: string): Promise<void> {
  const a = player()
  a.pause()
  a.src = audioUrl(key)
  setCurrent(key)
  return new Promise((resolve) => {
    const done = () => {
      a.removeEventListener('ended', done)
      a.removeEventListener('pause', done)
      a.removeEventListener('error', done)
      resolve()
    }
    a.addEventListener('ended', done)
    a.addEventListener('pause', done)
    a.addEventListener('error', done)
    a.play().catch(() => {
      setCurrent(null)
      done()
    })
  })
}

export function stop() {
  sequenceToken++
  el?.pause()
  setCurrent(null)
}

/** Play clips one after another with a short gap; a new play/stop cancels it. */
export async function playSequence(keys: string[], gapMs = 500) {
  const token = ++sequenceToken
  for (const key of keys) {
    if (token !== sequenceToken) return
    await play(key)
    if (token !== sequenceToken) return
    await new Promise((r) => setTimeout(r, gapMs))
  }
  if (token === sequenceToken) setCurrent(null)
}

/** Key of the clip currently playing (or null). */
export function usePlaying() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}
