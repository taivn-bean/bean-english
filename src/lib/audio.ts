// Single shared HTMLAudioElement: most reliable on iOS (respects user-gesture rules, no Web Audio silent-switch issues).
import { useSyncExternalStore } from 'react'
import { readPack } from './offline'

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

// ---- Clip storage: clips live inside immutable pack files (see scripts/lib/packs.mjs) ----
const clips = new Map<string, { pack: string; start: number; end: number }>()
const packBlobs = new Map<string, Blob>()
const packLoads = new Map<string, Promise<Blob>>()
const clipUrls = new Map<string, string>()

/** Make a topic's clips playable and start loading its packs (offline cache first, then network). */
export function registerAudio({ packs, index }: { packs: string[]; index: Record<string, [number, number, number]> }) {
  for (const [key, [i, off, len]] of Object.entries(index)) clips.set(key, { pack: packs[i], start: off, end: off + len })
  packs.forEach((url) => void loadPack(url).catch(() => {}))
}

function loadPack(url: string) {
  let p = packLoads.get(url)
  if (!p) {
    p = readPack(url).then((blob) => (packBlobs.set(url, blob), blob))
    p.catch(() => packLoads.delete(url)) // allow retry
    packLoads.set(url, p)
  }
  return p
}

/** Object URL for a clip if its pack is already in memory (sync → keeps the iOS user-gesture chain). */
function clipUrlNow(key: string) {
  const cached = clipUrls.get(key)
  if (cached) return cached
  const c = clips.get(key)
  const blob = c && packBlobs.get(c.pack)
  if (!c || !blob) return null
  const url = URL.createObjectURL(blob.slice(c.start, c.end, 'audio/mp4')) // slice = no copy
  clipUrls.set(key, url)
  return url
}

async function clipUrl(key: string) {
  const c = clips.get(key)
  if (!c) return null
  await loadPack(c.pack)
  return clipUrlNow(key)
}

function playClip(key: string): Promise<void> {
  const a = player()
  a.pause()
  update({ current: key })
  const now = clipUrlNow(key)
  if (now) return playUrl(a, now)
  return clipUrl(key).then((url) => {
    if (state.current !== key) return // something else started meanwhile
    if (!url) return void update({ current: null })
    return playUrl(a, url)
  })
}

function playUrl(a: HTMLAudioElement, url: string): Promise<void> {
  a.src = url
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
