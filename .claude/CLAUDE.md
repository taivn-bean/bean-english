# Bean English — project guide

App học tiếng Anh cho **ba mẹ + con nhỏ (3 tuổi)**. Ba mẹ không thạo giao tiếp tiếng Anh → app cung cấp
**mẫu câu theo chủ đề** và **đoạn hội thoại ngắn** để ba mẹ đọc/nghe rồi nói lại với bé trong sinh hoạt hằng ngày.

## Ràng buộc cứng
- **Full offline** sau lần mở đầu tiên (PWA, service worker precache toàn bộ nội dung + audio).
- Thiết bị chính: **iPhone (Safari → Add to Home Screen)**. Không có Apple Developer account → KHÔNG native app, KHÔNG App Store.
- Stack: **React SPA + Vite + TypeScript**, PWA qua `vite-plugin-pwa` (Workbox), deploy **Cloudflare** (Workers static assets / Pages).
- Không backend bắt buộc: app chạy đủ offline. Dữ liệu người dùng (yêu thích, tiến độ, thẻ từ) lưu local (IndexedDB).
- Ngoại lệ duy nhất (tuỳ chọn): **nhắc học mỗi ngày** = Web Push qua Cloudflare Worker + D1 + Cron (free). Server chỉ lưu endpoint push + giờ nhắc + múi giờ + ngôn ngữ — không dữ liệu trẻ em.
- Không thu thập dữ liệu trẻ em, không analytics bên thứ ba, không quảng cáo.

## Tài liệu
- [docs/product-brief.md](docs/product-brief.md) — những gì đã biết + quyết định đã chốt
- [docs/discovery-questions.md](docs/discovery-questions.md) — câu hỏi đang chờ trả lời
- [docs/content-schema.md](docs/content-schema.md) — schema dữ liệu mẫu câu / hội thoại

## Agents (.claude/agents)
| Agent | Việc | Skills |
|---|---|---|
| product-planner | làm rõ yêu cầu, backlog, roadmap | (docs) |
| content-curator | soạn mẫu câu/hội thoại EN↔VI theo chủ đề | bean-content-authoring |
| audio-producer | sinh & tối ưu file audio offline | offline-audio |
| pwa-frontend-dev | code React PWA | pwa-offline-react, kid-friendly-ui, run, simplify |
| cloudflare-deployer | build & deploy Cloudflare | cloudflare-deploy |
| qa-tester | test offline/iOS/UX | ios-pwa-qa, run, code-review |

## Quy ước
- Trao đổi với user bằng **tiếng Việt**; code, tên biến, commit message bằng tiếng Anh.
- Nội dung tiếng Anh: câu ngắn, tự nhiên, kiểu người bản xứ nói với trẻ nhỏ (child-directed speech), không dịch word-by-word.
- Mọi asset dùng trong app phải nằm trong precache manifest — không fetch runtime từ CDN ngoài.

## Lệnh
| Lệnh | Việc |
|---|---|
| `pnpm dev` | build nội dung + chạy dev server |
| `pnpm audio` | sinh audio cho câu mới/đổi (Kokoro local → HE-AAC) và gói thành **1 patch mới**; gói cũ không đổi; dừng giữa chừng chạy lại sẽ tiếp tục |
| `pnpm audio:compact` | dựng lại 1 gói base/chủ đề, bỏ patch + byte chết (user tải lại audio 1 lần) |
| `pnpm content:check` | validate nội dung + báo thiếu audio |
| `pnpm build` / `pnpm preview` | build production (fail nếu thiếu audio) / chạy thử bản build |
| `pnpm test:offline` | Playwright: offline, deep link, audio, tiến độ (cần `pnpm preview` đang chạy) |
| `pnpm run deploy` | build + `wrangler deploy` (hỏi user trước khi chạy) |
| `pnpm test:push` | kiểm tra mã hoá Web Push + chữ ký VAPID (so với http_ece / node:crypto) |
| `pnpm worker:types` | sinh lại kiểu `Env` cho Worker sau khi sửa wrangler.jsonc |

## Cấu trúc
```
content/                 nguồn nội dung (sửa ở đây) — topics.json + topics/<id>.json · vocab.json + vocab/<deckId>.json (flash-card)
scripts/                 build-content.mjs (zod + IPA + audio keys), gen-audio.mjs, voices.json, lib/
public/content/          SINH TỰ ĐỘNG (gitignored) — app fetch qua TanStack Query
audio/packs/, packs.json COMMIT — gói audio bất biến + sổ cái (xem .claude/docs/content-schema.md)
public/audio-packs/      SINH TỰ ĐỘNG (gitignored) — copy các gói đang dùng
src/routes/               trang = route file của TanStack Router; chỉ ghép UI từ features/ (routeTree.gen.ts tự sinh)
src/features/<feature>/   mỗi tính năng 1 thư mục: logic (.ts) + hook (use*.ts) + component (.tsx) của riêng nó
  content/                types + query nội dung, PhraseCard, useTopics, suggestions (gợi ý theo giờ)
  audio/                  player 1 HTMLAudioElement + playlist, PlaylistBar
  offline/                gói audio offline (Cache Storage), OfflineTag/OfflineStatus, useTopicOffline
  profile/                hồ sơ bé (ProfileManager ở Cài đặt), tiến độ, yêu thích, độ tuổi, chuỗi ngày (activity), Avatar, TodayCard (trang chủ)
  cards/                  flash-card: lặp lại ngắt quãng (cards.ts), useCards, CardsSection, SwipeCard (lật 3D + vuốt), Celebration, WordVisual
  backup/ · pwa/          sao lưu/khôi phục JSON · banner cập nhật + hướng dẫn cài
src/shared/               dùng chung mọi feature: db.ts (Dexie schema), settings.ts (zustand), ui/ (Layout, TopicIcon)
src/i18n/                 vi.json, en.json (en tải lười)
  rewards/                sticker thưởng (tính từ số liệu sẵn có), StickerAlbum, NewStickerPopup
  reminders/              nhắc học: đăng ký Web Push (push.ts), ReminderSettings
worker/                   Cloudflare Worker: /api/push/* + cron gửi nhắc (index.ts), webpush.ts (VAPID + aes128gcm, không lib)
migrations/               schema D1 `bean-push` (wrangler d1 migrations apply bean-push --remote)
public/push-sw.js         xử lý push/notificationclick, được importScripts vào SW của Workbox
```
- Thêm chủ đề: thêm vào `content/topics.json` + file `content/topics/<id>.json`, icon mới thì thêm vào `src/shared/ui/TopicIcon.tsx`, rồi `pnpm audio`.
- Đổi giọng (1 giọng cho tất cả): sửa `voice` trong `scripts/voices.json` (chỉ dùng Kokoro, không dùng giọng hệ thống macOS) rồi `pnpm audio`. Nghe thử nhiều giọng Kokoro: `node scripts/kokoro-samples.mjs <dir> af_heart,am_michael`.
- Thêm bộ thẻ từ vựng: thêm vào `content/vocab.json` + `content/vocab/<deckId>.json` (id `v-…`), kiểm tra `node scripts/check-vocab.mjs <deckId>`, icon mới thêm vào `src/shared/ui/TopicIcon.tsx`, rồi `pnpm audio`.
- Quy tắc import: dùng alias `@/` (`@/features/cards/cards`, `@/shared/db`); file cùng thư mục feature import `./x`. Không tạo barrel `index.ts` (giữ code-split + bundle khởi động nhỏ). Feature được import feature khác; thứ mà ≥3 feature cần thì chuyển vào `shared/`.
- Thêm chuỗi UI: thêm key vào CẢ `vi.json` và `en.json`.
