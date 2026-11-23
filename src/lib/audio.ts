// Single shared HTMLAudioElement: most reliable on iOS (respects user-gesture rules, no Web Audio silent-switch issues).
import { useSyncExternalStore } from 'react'
import { audioUrl } from './content'

type AudioState = {
  /** key of the clip currently playing */
  current: string | null
  /** id of the running playlist (play-all), if any */
  sequenceId: string | null
  loop: boolean
  /** title of the running playlist */
  label: string
}

let el: HTMLAudioElement | null = null
let state: AudioState = { current: null, sequenceId: null, loop: false, label: '' }
let sequenceToken = 0
const listeners = new Set<() => void>()

const update = (patch: Partial<AudioState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function player() {
  if (!el) {
    el = new Audio()
    el.preload = 'auto'
    el.addEventListener('ended', () => update({ current: null }))
    el.addEventListener('error', () => update({ current: null }))
    // Safari 16.4+: play even when the ring/silent switch is on
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
  }
  return el
}

function playClip(key: string): Promise<void> {
  const a = player()
  a.pause()
  a.src = audioUrl(key)
  update({ current: key })
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
      update({ current: null })
      done()
    })
  })
}

/** Play one clip (cancels any running playlist). Resolves when it ends or is interrupted. */
export function play(key: string): Promise<void> {
  sequenceToken++
  if (state.sequenceId) update({ sequenceId: null })
  return playClip(key)
}

export function stop() {
  sequenceToken++
  el?.pause()
  update({ current: null, sequenceId: null })
}

export type PlaylistItem = { key: string; title: string }

/**
 * Play clips one after another (hands-free listening). A new play/stop cancels it.
 * With `loop`, starts over at the end until stopped.
 */
export async function playSequence(id: string, items: PlaylistItem[], { loop = false, gapMs = 1200, label = '' } = {}) {
  if (!items.length) return
  const token = ++sequenceToken
  update({ sequenceId: id, loop, label })
  setMediaSession(label)
  do {
    for (const item of items) {
      if (token !== sequenceToken) return
      setMediaSession(label, item.title)
      await playClip(item.key)
      if (token !== sequenceToken) return
      await new Promise((r) => setTimeout(r, gapMs))
    }
  } while (state.loop && token === sequenceToken)
  if (token === sequenceToken) update({ current: null, sequenceId: null })
}

export function setLoop(loop: boolean) {
  update({ loop })
}

/** Lock-screen / Control Center info + stop button. */
function setMediaSession(album: string, title = album) {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title, album, artist: 'Bean English', artwork: [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }] })
    navigator.mediaSession.setActionHandler('stop', stop)
    navigator.mediaSession.setActionHandler('pause', stop)
  } catch {
    /* unsupported action */
  }
}

export function useAudioState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

/** Key of the clip currently playing (or null). */
export const usePlaying = () => useAudioState().current
