# Bean English — project guide

App học tiếng Anh cho **ba mẹ + con nhỏ (3 tuổi)**. Ba mẹ không thạo giao tiếp tiếng Anh → app cung cấp
**mẫu câu theo chủ đề** và **đoạn hội thoại ngắn** để ba mẹ đọc/nghe rồi nói lại với bé trong sinh hoạt hằng ngày.

## Ràng buộc cứng
- **Full offline** sau lần mở đầu tiên (PWA, service worker precache toàn bộ nội dung + audio).
- Thiết bị chính: **iPhone (Safari → Add to Home Screen)**. Không có Apple Developer account → KHÔNG native app, KHÔNG App Store.
- Stack: **React SPA + Vite + TypeScript**, PWA qua `vite-plugin-pwa` (Workbox), deploy **Cloudflare** (Workers static assets / Pages).
- Không backend bắt buộc. Dữ liệu người dùng (yêu thích, tiến độ) lưu local (IndexedDB).
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
| `pnpm deploy` | build + `wrangler deploy` (hỏi user trước khi chạy) |

## Cấu trúc
```
content/                 nguồn nội dung (sửa ở đây) — topics.json + topics/<id>.json
scripts/                 build-content.mjs (zod + IPA + audio keys), gen-audio.mjs, voices.json, lib/
public/content/          SINH TỰ ĐỘNG (gitignored) — app fetch qua TanStack Query
audio/packs/, packs.json COMMIT — gói audio bất biến + sổ cái (xem .claude/docs/content-schema.md)
public/audio-packs/      SINH TỰ ĐỘNG (gitignored) — copy các gói đang dùng
src/routes/              TanStack Router file-based (routeTree.gen.ts tự sinh)
src/components/          UI dùng chung (PhraseCard, PlaylistBar, Layout…)
src/lib/                 content, audio (player + playlist), db (Dexie), settings (zustand), suggestions (gợi ý theo giờ), backup
src/hooks/               useProfile (profiles, progress, favorites), useContent (load nhiều topic) · src/i18n/ vi.json, en.json
```
- Thêm chủ đề: thêm vào `content/topics.json` + file `content/topics/<id>.json`, icon mới thì thêm vào `src/components/TopicIcon.tsx`, rồi `pnpm audio`.
- Đổi giọng (1 giọng cho tất cả): sửa `voice` trong `scripts/voices.json` (chỉ dùng Kokoro, không dùng giọng hệ thống macOS) rồi `pnpm audio`. Nghe thử nhiều giọng Kokoro: `node scripts/kokoro-samples.mjs <dir> af_heart,am_michael`.
- Thêm chuỗi UI: thêm key vào CẢ `vi.json` và `en.json`.
