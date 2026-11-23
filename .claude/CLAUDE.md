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
| `pnpm audio` | build nội dung + sinh audio còn thiếu/đã đổi (macOS `say` → `afconvert`), xoá file thừa |
| `pnpm content:check` | validate nội dung + báo thiếu audio |
| `pnpm build` / `pnpm preview` | build production (fail nếu thiếu audio) / chạy thử bản build |
| `pnpm test:offline` | Playwright: offline, deep link, audio, tiến độ (cần `pnpm preview` đang chạy) |
| `pnpm deploy` | build + `wrangler deploy` (hỏi user trước khi chạy) |

## Cấu trúc
```
content/                 nguồn nội dung (sửa ở đây) — topics.json + topics/<id>.json
scripts/                 build-content.mjs (zod + IPA + audio keys), gen-audio.mjs, voices.json, lib/
public/content/          SINH TỰ ĐỘNG (gitignored) — app fetch qua TanStack Query
public/audio/            SINH TỰ ĐỘNG nhưng COMMIT (Cloudflare build không có `say`)
src/routes/              TanStack Router file-based (routeTree.gen.ts tự sinh)
src/components/          UI dùng chung · src/lib/ content, audio, db (Dexie), settings (zustand)
src/hooks/               hooks dữ liệu local (profiles, progress, favorites) · src/i18n/ vi.json, en.json
```
- Thêm chủ đề: thêm vào `content/topics.json` + file `content/topics/<id>.json`, icon mới thì thêm vào `src/components/TopicIcon.tsx`, rồi `pnpm audio`.
- Đổi giọng (1 giọng cho tất cả): sửa `scripts/voices.json` rồi `pnpm audio`.
- Thêm chuỗi UI: thêm key vào CẢ `vi.json` và `en.json`.
