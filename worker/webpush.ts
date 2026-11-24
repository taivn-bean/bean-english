// Minimal Web Push sender on WebCrypto only (runs in Cloudflare Workers and Node ≥ 20):
//   • VAPID auth (RFC 8292): ES256-signed JWT
//   • payload encryption "aes128gcm" (RFC 8291 + RFC 8188), single record
// No npm dependency, so nothing to audit or bundle beyond this file.

export type PushSubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } }
export type VapidKeys = { publicKey: string; privateKey: string; subject: string } // base64url raw P-256 public (65 B) / private scalar d (32 B)

const enc = new TextEncoder()

export const b64url = {
  encode(bytes: ArrayBuffer | Uint8Array) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    let s = ''
    for (const b of u8) s += String.fromCharCode(b)
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  },
  decode(str: string) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4))
    return Uint8Array.from(s, (c) => c.charCodeAt(0))
  },
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8))
}

/** VAPID `Authorization` header value for one push service origin. */
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, ttlSeconds = 12 * 3600) {
  const pub = b64url.decode(vapid.publicKey) // 0x04 || X(32) || Y(32)
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: vapid.privateKey, x: b64url.encode(pub.slice(1, 33)), y: b64url.encode(pub.slice(33, 65)), ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const header = b64url.encode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = { aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + ttlSeconds, sub: vapid.subject }
  const body = b64url.encode(enc.encode(JSON.stringify(claims)))
  // WebCrypto ECDSA returns raw r||s (64 bytes) = exactly the JWS ES256 signature format
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${body}`))
  return `vapid t=${header}.${body}.${b64url.encode(sig)}, k=${vapid.publicKey}`
}

/** Encrypt a payload for one subscription (RFC 8291, aes128gcm, one record). */
export async function encryptPayload(sub: PushSubscriptionJSON, plaintext: Uint8Array) {
  const uaPublic = b64url.decode(sub.keys.p256dh)
  const authSecret = b64url.decode(sub.keys.auth)
  const asKeys = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', asKeys.publicKey)) as ArrayBuffer)
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  // standard WebCrypto name is `public` (workers-types calls it `$public`; the runtime accepts `public`)
  const ecdhParams = { name: 'ECDH', public: uaKey } as unknown as Parameters<typeof crypto.subtle.deriveBits>[0]
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits(ecdhParams, asKeys.privateKey, 256))

  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const record = concat(plaintext, new Uint8Array([2])) // 0x02 = last-record delimiter, no padding
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, record))

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  // header: salt(16) | record size(4) | key id length(1) | key id = sender public key(65)
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext)
}

export type SendResult = { ok: boolean; status: number; gone: boolean }

/** Send one notification. `gone` = subscription expired/unsubscribed (404/410) → delete it. */
export async function sendPush(sub: PushSubscriptionJSON, payload: unknown, vapid: VapidKeys, { ttl = 4 * 3600, urgency = 'normal' } = {}): Promise<SendResult> {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(payload)))
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(sub.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: urgency,
    },
    body,
  })
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 }
}
