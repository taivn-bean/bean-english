// Daily reminder via Web Push. The browser subscribes with our VAPID public key; the Worker
// (worker/index.ts, Cloudflare D1 + Cron) stores endpoint + local time and sends the reminder.
// iOS: only works in the installed home-screen app (iOS 16.4+), and permission needs a tap.
import { isIos, isStandalone } from '@/features/pwa/PwaPrompts'

/** Public VAPID key — keep in sync with wrangler.jsonc vars.VAPID_PUBLIC_KEY. */
const VAPID_PUBLIC_KEY = 'BAIRiLTVAUscTOI5PZDmIbUN5ztf56r1Eruj6KuHqmgWVq-OrLPAjcnjnU985ko4nBeY89gZXZV8mr60MFdtB98'

export type PushSupport = 'ok' | 'install-first' | 'unsupported'

export function pushSupport(): PushSupport {
  const apis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (apis && (!isIos() || isStandalone())) return 'ok'
  return isIos() && !isStandalone() ? 'install-first' : 'unsupported'
}

const keyBytes = (b64: string) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function registration() {
  return navigator.serviceWorker.ready
}

export async function currentSubscription() {
  if (pushSupport() !== 'ok') return null
  return (await registration()).pushManager.getSubscription()
}

async function post(path: string, body: unknown) {
  const res = await fetch(`/api/push/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
}

/** Ask permission (call straight from a tap), subscribe and save the reminder time on the server. */
export async function enableReminder(time: string, lang: string) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'denied' : 'dismissed')
  const reg = await registration()
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
  await saveReminder(sub, time, lang)
}

/** Update time/language of an existing subscription. */
export async function saveReminder(sub: PushSubscription, time: string, lang: string) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  await post('subscribe', { subscription: sub.toJSON(), time, tz, lang })
}

export async function disableReminder() {
  const sub = await currentSubscription()
  if (!sub) return
  await post('unsubscribe', { endpoint: sub.endpoint }).catch(() => {}) // server also drops dead endpoints itself
  await sub.unsubscribe()
}

export async function sendTest() {
  const sub = await currentSubscription()
  if (!sub) throw new Error('not-subscribed')
  await post('test', { endpoint: sub.endpoint })
}
