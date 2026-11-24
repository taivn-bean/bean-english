# Product brief — Bean English

_Cập nhật: 2026-11-23_

## Bối cảnh
- Người dùng chính: ba mẹ Việt, tiếng Anh giao tiếp hạn chế.
- Người hưởng lợi: bé 3 tuổi (nghe, lặp lại, phản xạ trong sinh hoạt).
- Thiết bị: iPhone. Không có Apple Developer account, không mua theo năm.

## Giá trị cốt lõi
Ba mẹ mở app → chọn tình huống (ăn, tắm, đi ngủ, chơi...) → thấy câu tiếng Anh + nghĩa tiếng Việt + nghe audio chuẩn
→ nói lại với bé ngay lúc đó.

## Quyết định đã chốt
| # | Quyết định | Lý do |
|---|---|---|
| D1 | React SPA (Vite + TS) | user chọn |
| D2 | PWA full offline, cài qua Safari "Add to Home Screen" | không có Apple Dev account |
| D3 | Deploy Cloudflare (static assets) | user chọn, free tier đủ |
| D4 | Nội dung đóng gói tĩnh (JSON + audio) trong build | offline, không cần backend |
| D5 | Audio **pre-generate lúc build** (không phụ thuộc TTS runtime) | giọng ổn định, chạy offline chắc chắn trên iOS; Web Speech chỉ là fallback |

| D6 | Ba mẹ cầm máy; luồng chính phải nhanh (≤3 chạm) | Q1–2 |
| D7 | Link công khai, ai cũng dùng được, không đăng nhập | Q3 |
| D8 | Nhiều hồ sơ bé, lưu trên trình duyệt (IndexedDB/Dexie) | Q4 |
| D9 | 10 chủ đề xoay quanh sinh hoạt của bé × 20 câu + 2 hội thoại/chủ đề; agent soạn | Q5–7 |
| D10 | ~~Giọng Mỹ, 3 giọng riêng: ba / mẹ / bé~~ → thay bởi D23 | Q8 |
| D11 | Có IPA (tự sinh từ CMU dict, cho phép ghi đè). Không làm chế độ đọc chậm | Q9 |
| D12 | Có câu mẫu thay từ (`___` + slots), mỗi biến thể có audio riêng | Q10 |
| D13 | Không dùng hình minh hoạ, chỉ icon (lucide) | Q12 |
| D14 | Theo dõi tiến độ theo từng bé: "Ba mẹ đã thuộc" / "Bé đã nói được" | Q13 |
| D15 | Không đồng bộ giữa các máy (phase sau, khi có backend) | Q14 |
| D16 | Linh vật: con mèo. Màu chủ đạo: xanh lá nhạt | Q15 |
| D17 | Giao diện song ngữ VI/EN qua i18n (mặc định VI) | Q16 |
| D18 | Deploy static PWA lên Cloudflare, tài khoản free | Q17 |
| D19 | TTS bằng giọng có sẵn của macOS (`say`), sinh bằng script Node — không tốn token | Q18 |
| D20 | Stack: Vite + React + TS, TanStack Router + Query, Dexie, i18next, Tailwind, vite-plugin-pwa, Zod, lucide | yêu cầu |
| D21 | Offline-first, nhưng nội dung đi qua lớp fetch (TanStack Query + `contentVersion`) để phase sau lấy nội dung mới từ server | yêu cầu |
| D23 | Chỉ 1 giọng cho toàn bộ audio: **Evan (Enhanced)** (giọng bé tổng hợp nghe không tự nhiên) | user, 2026-11-23 |
| D25 | TTS chuyển sang **Kokoro-82M (local, Apache-2.0) qua kokoro-js**, giọng **af_heart** cho mọi câu (thay D23/Evan) | user, 2026-11-23 |
| D26 | Audio đóng gói bất biến: **base theo chủ đề + patch theo đợt**, HE-AAC 24k; precache ~30 file thay vì ~1900 (Workbox cài tuần tự) + thanh tiến độ tải offline | user, 2026-11-23 |
| D30 | **Chỉ dùng Kokoro**: bỏ engine macOS `say` khỏi `gen-audio`, gỡ các giọng hệ thống đã tải (Evan, Zoe) | user, 2026-11-24 |
| D31 | **Flash-card từ vựng cho bé**: 40 bộ thẻ × ~50 từ (≈2000 từ) theo chủ đề, mỗi từ 5 câu mẫu đa dạng; mặt trước = emoji/icon + nghe audio, mặt sau = từ, IPA, nghĩa, 5 câu; ôn theo lặp lại ngắt quãng (Leitner 1→3→7→14→30→60 ngày, ba mẹ bấm Chưa nhớ/Nhớ rồi), tiến độ theo từng bé; đặt trong trang Avatar + trang /cards | user, 2026-11-24 |
| D32 | UI/UX đợt 1: ô "Hôm nay của bé" trên trang chủ (chuỗi ngày, ôn thẻ, học tiếp chủ đề gần nhất); thẻ câu gọn (cột icon ✓/💬/☆ + chú thích); toast nằm trên menu, tự tắt 3s; flash-card lật 3D, vuốt phải/trái để chấm, confetti + mèo khen; trang Tiến độ = số liệu + biểu đồ 7 ngày, quản lý hồ sơ chuyển sang Cài đặt | user, 2026-11-24 |
| D33 | Menu dưới 5 mục: Chủ đề · **Thẻ từ** (badge số thẻ cần ôn) · Yêu thích · Tiến độ · Cài đặt (thay quyết định giữ 4 mục cũ); flash-card trộn thẻ mặc định (nút 🔀, nhớ lựa chọn) | user, 2026-11-24 |
| D34 | **Sticker thưởng** (16 sticker emoji theo mốc: số từ đã học/thuộc, chuỗi ngày, câu bé nói được), album ở trang Avatar, popup khi nhận mới. **Nhắc học mỗi ngày** bằng Web Push trên Cloudflare free: Worker (`/api/push/*`, chạy trước static assets) + D1 `bean-push` + Cron */10 phút + secret VAPID; iOS chỉ nhận khi mở từ icon màn hình chính (iOS 16.4+) | user, 2026-11-24 |
| D27 | Nhóm tuổi 3-5 / 5-7 / 7-9, **chọn tay** trên từng hồ sơ bé; câu/hội thoại gắn `ages`; 13 chủ đề mới cho 5-7 & 7-9, ~30 câu + 5 hội thoại/chủ đề; câu phải tự nhiên, dùng thực tế | user, 2026-11-23 |
| D28 | Người dùng **chọn chủ đề để tải audio offline** (trang Gói audio offline, gợi ý tải theo độ tuổi, nhãn "Chưa tải offline", xoá được). SW chỉ precache app + nội dung chữ; audio ở cache riêng `bean-audio-v1` (src/features/offline/offline.ts), tự lấy patch mới cho chủ đề đã chọn | user, 2026-11-23 |
| D29 | Nhật ký "Bé nói được" (ghi chú, chia sẻ), chuỗi ngày dùng (tính khi phát audio/đánh dấu), trang Avatar (con vật, màu, phụ kiện mở khoá theo chuỗi dài nhất). Menu dưới giữ nguyên 4 mục | user, 2026-11-23 |
| D24 | Tính năng đợt 2: gợi ý theo giờ + "3 câu" mỗi buổi, tìm kiếm VI/EN không dấu (MiniSearch), sao lưu/khôi phục JSON, nghe liên tục (playlist, lặp, Media Session) | user, 2026-11-23 |
| D22 | Bản dùng thử: trong 24h kể từ 2026-11-23 | Q20 |

## Chưa chốt
- Q11 (danh sách tính năng): MVP tạm gồm duyệt chủ đề + nghe, câu mẫu thay từ, hội thoại phát lần lượt, yêu thích, tiến độ, hồ sơ bé, cài đặt (ngôn ngữ, IPA, hướng dẫn cài). Đã làm thêm: D24. Backlog tiếp: ôn tập flashcard cho ba mẹ, chế độ bé bấm, nhật ký "Bé nói được", chuỗi ngày, tự thêm câu, ghi âm, chia sẻ câu, backend phase 2.
- Q19 (dung lượng): ước tính audio < 15MB → precache toàn bộ.

## Rủi ro kỹ thuật đã biết (iOS PWA)
- Cache/IndexedDB có thể bị iOS dọn khi thiếu dung lượng → cần nút "Tải lại dữ liệu offline" và kiểm tra tính toàn vẹn cache.
- Audio cần user gesture để phát lần đầu; công tắc im lặng có thể làm tắt tiếng Web Audio → dùng `<audio>` / HTMLAudioElement.
- `SpeechRecognition` cần mạng trên iOS → không đưa vào tính năng cốt lõi offline.
- Dung lượng: giữ tổng audio < ~50–100MB giai đoạn đầu (m4a/aac mono 48–64kbps).
