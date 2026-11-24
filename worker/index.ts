// Bean English Worker: static assets are served by Cloudflare directly; this script only runs for
// /api/* (see wrangler.jsonc "run_worker_first") and for the cron that sends daily reminders.
//
//   POST /api/push/subscribe    { subscription, time: "HH:MM", tz, lang }   upsert
//   POST /api/push/unsubscribe  { endpoint }
//   POST /api/push/test         { endpoint }   send one now (max 1/min)
//   cron */10 * * * *           send today's reminder to every subscription whose local time has come
import { b64url, sendPush, type PushSubscriptionJSON, type VapidKeys } from './webpush'

// `Env` (DB, VAPID_PUBLIC_KEY, VAPID_SUBJECT, secret VAPID_PRIVATE_KEY) is generated from wrangler.jsonc
// into worker-configuration.d.ts by `wrangler types worker/worker-configuration.d.ts`.

type Row = { endpoint: string; p256dh: string; auth: string; remind_at: string; tz: string; lang: string; last_sent_day: string | null; last_test_at: number | null }

/** Push services browsers actually use — anything else is rejected (no open relay). */
const PUSH_HOSTS = [/\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/]
/** Free plan: ≤ 50 outgoing fetches per invocation. Leftovers go out on the next run (10 min later). */
const MAX_PER_RUN = 40
/** Don't send a reminder that is more than this late (e.g. the phone was subscribed after the time). */
const LATE_WINDOW_MIN = 60

const MESSAGES = {
  vi: [
    { title: 'Đến giờ học cùng bé rồi 🐱', body: 'Dành 5 phút nói tiếng Anh với bé nha!' },
    { title: 'Bean nhớ bé quá 🐾', body: 'Hôm nay mình học vài từ mới nhé?' },
    { title: 'Giữ chuỗi ngày học nào 🔥', body: 'Mở Bean và ôn vài thẻ từ cùng bé nha.' },
    { title: 'Câu tiếng Anh hôm nay 💬', body: 'Thử nói một câu mới với bé trong bữa tối nhé!' },
    { title: 'Bé ơi, học chút nha 🌟', body: 'Vài phút mỗi ngày là đủ để bé tiến bộ.' },
  ],
  en: [
    { title: 'Time to learn together 🐱', body: 'Spend 5 minutes speaking English with your child!' },
    { title: 'Bean misses you 🐾', body: 'Shall we learn a few new words today?' },
    { title: 'Keep your streak going 🔥', body: 'Open Bean and review a few word cards.' },
    { title: "Today's English phrase 💬", body: 'Try a new phrase with your child at dinner!' },
    { title: 'A little practice today 🌟', body: 'A few minutes a day is all it takes.' },
  ],
} as const

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

const vapidOf = (env: Env): VapidKeys => ({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT })
const subOf = (r: Row): PushSubscriptionJSON => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } })

/** Local day + minute-of-day in a time zone. */
function localNow(tz: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) }
}

function message(lang: string, day: string) {
  const list = lang === 'en' ? MESSAGES.en : MESSAGES.vi
  const n = Number(day.replaceAll('-', '')) % list.length // rotate daily, same for everyone that day
  return { ...list[n], url: '/', tag: 'bean-daily', lang }
}

const validTz = (tz: unknown): tz is string => {
  if (typeof tz !== 'string' || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function parseSubscription(v: unknown): PushSubscriptionJSON | null {
  const s = v as PushSubscriptionJSON
  try {
    const url = new URL(s.endpoint)
    if (url.protocol !== 'https:' || !PUSH_HOSTS.some((re) => re.test(url.hostname)) || s.endpoint.length > 1024) return null
    if (b64url.decode(s.keys.p256dh).length !== 65 || b64url.decode(s.keys.auth).length !== 16) return null
    return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }
  } catch {
    return null
  }
}

async function handleApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  // same-origin only (the PWA itself), keeps other sites from using this API
  if (req.headers.get('Origin') !== url.origin) return json({ error: 'origin' }, 403)
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return json({ error: 'body' }, 400)
  const now = Date.now()

  if (url.pathname === '/api/push/subscribe') {
    const sub = parseSubscription(body.subscription)
    const time = typeof body.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.time) ? body.time : null
    const lang = body.lang === 'en' ? 'en' : 'vi'
    if (!sub || !time || !validTz(body.tz)) return json({ error: 'invalid' }, 400)
    // a reminder time already passed today shouldn't fire right away → mark today as sent
    const { day, minute } = localNow(body.tz)
    const [h, m] = time.split(':').map(Number)
    const lastSent = minute >= h * 60 + m ? day : null
    await env.DB.prepare(
      `INSERT INTO subscriptions (endpoint, p256dh, auth, remind_at, tz, lang, last_sent_day, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
       ON CONFLICT(endpoint) DO UPDATE SET p256dh = ?2, auth = ?3, remind_at = ?4, tz = ?5, lang = ?6, last_sent_day = ?7, updated_at = ?8`,
    )
      .bind(sub.endpoint, sub.keys.p256dh, sub.keys.auth, time, body.tz, lang, lastSent, now)
      .run()
    return json({ ok: true })
  }

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : ''
  if (url.pathname === '/api/push/unsubscribe') {
    await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint = ?1').bind(endpoint).run()
    return json({ ok: true })
  }

  if (url.pathname === '/api/push/test') {
    const row = await env.DB.prepare('SELECT * FROM subscriptions WHERE endpoint = ?1').bind(endpoint).first<Row>()
    if (!row) return json({ error: 'not-found' }, 404)
    if (row.last_test_at && now - row.last_test_at < 60_000) return json({ error: 'too-soon' }, 429)
    await env.DB.prepare('UPDATE subscriptions SET last_test_at = ?2 WHERE endpoint = ?1').bind(endpoint, now).run()
    const res = await sendPush(subOf(row), message(row.lang, localNow(row.tz).day), vapidOf(env), { ttl: 600 })
    if (res.gone) await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint = ?1').bind(endpoint).run()
    return json({ ok: res.ok, status: res.status }, res.ok ? 200 : 502)
  }

  return json({ error: 'not-found' }, 404)
}

async function sendDue(env: Env) {
  const { results } = await env.DB.prepare('SELECT * FROM subscriptions').all<Row>()
  const now = new Date()
  const due = results.filter((r) => {
    const { day, minute } = localNow(r.tz, now)
    const [h, m] = r.remind_at.split(':').map(Number)
    const late = minute - (h * 60 + m)
    return r.last_sent_day !== day && late >= 0 && late < LATE_WINDOW_MIN
  })
  let sent = 0
  for (const r of due.slice(0, MAX_PER_RUN)) {
    const day = localNow(r.tz, now).day
    // mark first: a failure must not cause a burst of retries every 10 minutes
    await env.DB.prepare('UPDATE subscriptions SET last_sent_day = ?2 WHERE endpoint = ?1').bind(r.endpoint, day).run()
    try {
      const res = await sendPush(subOf(r), message(r.lang, day), vapidOf(env))
      if (res.gone) await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint = ?1').bind(r.endpoint).run()
      else if (res.ok) sent++
      else console.warn('push failed', res.status, new URL(r.endpoint).hostname)
    } catch (e) {
      console.warn('push error', (e as Error).message)
    }
  }
  console.log(`reminders: ${due.length} due, ${sent} sent, ${results.length} subscriptions`)
}

export default {
  async fetch(req, env) {
    if (new URL(req.url).pathname.startsWith('/api/push/')) return handleApi(req, env)
    return json({ error: 'not-found' }, 404)
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDue(env))
  },
} satisfies ExportedHandler<Env>
