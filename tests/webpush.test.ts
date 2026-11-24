// Cross-check worker/webpush.ts against independent implementations:
//   payload → decrypted with `http_ece` (used by the `web-push` library), JWT → verified with node:crypto.
// Run: node tests/webpush.test.ts
import { createECDH, createPublicKey, randomBytes, verify } from 'node:crypto'
import ece from 'http_ece'
import { b64url, encryptPayload, vapidAuthorization } from '../worker/webpush.ts'

const fail = (m: string) => { console.error('FAIL', m); process.exit(1) }

// fake browser subscription
const ua = createECDH('prime256v1'); ua.generateKeys()
const auth = randomBytes(16)
const sub = { endpoint: 'https://web.push.apple.com/abc123', keys: { p256dh: b64url.encode(ua.getPublicKey()), auth: b64url.encode(auth) } }

const message = JSON.stringify({ title: 'Đến giờ học rồi 🐱', body: 'Câu hôm nay: Are you hungry?' })
const body = await encryptPayload(sub, new TextEncoder().encode(message))
const plain = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: ua, authSecret: auth })
if (plain.toString('utf8') !== message) fail('decrypted payload differs')
console.log('PASS  aes128gcm payload decrypts with http_ece')

// VAPID keys + JWT
const vapidEcdh = createECDH('prime256v1'); vapidEcdh.generateKeys()
const vapid = { publicKey: b64url.encode(vapidEcdh.getPublicKey()), privateKey: b64url.encode(vapidEcdh.getPrivateKey()), subject: 'https://example.com' }
const header = await vapidAuthorization(sub.endpoint, vapid)
const m = header.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/)
if (!m) fail('header format')
const [, h, p, s, k] = m!
if (k !== vapid.publicKey) fail('k param')
const claims = JSON.parse(Buffer.from(b64url.decode(p)).toString())
if (claims.aud !== 'https://web.push.apple.com' || claims.sub !== vapid.subject || claims.exp <= Date.now() / 1000) fail('claims ' + JSON.stringify(claims))
const pub = vapidEcdh.getPublicKey()
const key = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64url.encode(pub.subarray(1, 33)), y: b64url.encode(pub.subarray(33)) }, format: 'jwk' })
const ok = verify('sha256', Buffer.from(`${h}.${p}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(b64url.decode(s)))
if (!ok) fail('JWT signature')
console.log('PASS  VAPID ES256 JWT verifies (aud/sub/exp ok)')
