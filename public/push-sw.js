// Web Push handlers, imported into the generated Workbox service worker (vite.config.ts → importScripts).
// Payload (from worker/index.ts): { title, body, url, tag, lang }. The body is enriched with a
// "phrase of the day" read from the precached content, so it works without any extra request.

const dayNumber = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000)

async function cachedJson(path) {
  const res = await caches.match(path, { ignoreSearch: true }) // precache keys carry ?__WB_REVISION__
  return res ? res.json() : null
}

/** Same phrase for everyone on a given day: rotate through topics, then through their phrases. */
async function phraseOfDay(lang) {
  const index = await cachedJson('/content/index.json')
  if (!index?.topics?.length) return null
  const day = dayNumber()
  const meta = index.topics[day % index.topics.length]
  const topic = await cachedJson(`/content/topics/${meta.id}.json`)
  const list = topic?.phrases ?? []
  if (!list.length) return null
  const p = list[Math.floor(day / index.topics.length) % list.length]
  const en = p.slots ? p.slots[0].fullEn : p.en
  const vi = p.slots ? p.slots[0].fullVi : p.vi
  return lang === 'en' ? `💬 “${en}”` : `💬 “${en}” — ${vi}`
}

/** Word cards due today (all children) straight from the app's IndexedDB (Dexie db 'bean-english'). */
function dueCardCount() {
  return new Promise((resolve) => {
    const open = indexedDB.open('bean-english')
    open.onerror = () => resolve(0)
    open.onsuccess = () => {
      const idb = open.result
      if (!idb.objectStoreNames.contains('cards')) return idb.close(), resolve(0)
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      let n = 0
      const cursor = idb.transaction('cards').objectStore('cards').openCursor()
      cursor.onsuccess = () => {
        const c = cursor.result
        if (!c) return idb.close(), resolve(n)
        if (c.value.due <= today) n++
        c.continue()
      }
      cursor.onerror = () => (idb.close(), resolve(0))
    }
  })
}

/** Red badge on the home-screen icon (iOS 16.4+ installed PWA); same rule as src/features/cards/useAppBadge.ts. */
async function updateBadge() {
  if (!self.navigator.setAppBadge) return
  const due = await dueCardCount()
  await (due > 0 ? self.navigator.setAppBadge(due) : self.navigator.clearAppBadge())
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    /* not JSON */
  }
  event.waitUntil(
    (async () => {
      let body = data.body || ''
      try {
        const phrase = await phraseOfDay(data.lang)
        if (phrase) body = body ? `${body}\n${phrase}` : phrase
      } catch {
        /* content not cached yet: plain message */
      }
      await self.registration.showNotification(data.title || 'Bean English', {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
        tag: data.tag || 'bean',
        lang: data.lang || 'vi',
        data: { url: data.url || '/' },
      })
      await updateBadge().catch(() => {})
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin)
      if (win) {
        await win.focus()
        return win.navigate(url).catch(() => {})
      }
      return self.clients.openWindow(url)
    })(),
  )
})
