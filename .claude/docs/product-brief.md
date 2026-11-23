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
| D10 | Giọng Mỹ, 3 giọng riêng: ba / mẹ / bé. Câu của ba mẹ có cả 2 giọng, người dùng chọn | Q8 |
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
| D22 | Bản dùng thử: trong 24h kể từ 2026-11-23 | Q20 |

## Chưa chốt
- Q11 (danh sách tính năng): MVP tạm gồm duyệt chủ đề + nghe, câu mẫu thay từ, hội thoại phát lần lượt, yêu thích, tiến độ, hồ sơ bé, cài đặt (ngôn ngữ, giọng, hướng dẫn cài). Làm sau: tìm kiếm, chế độ cho bé tự bấm, ghi âm.
- Q19 (dung lượng): ước tính audio < 15MB → precache toàn bộ.

## Rủi ro kỹ thuật đã biết (iOS PWA)
- Cache/IndexedDB có thể bị iOS dọn khi thiếu dung lượng → cần nút "Tải lại dữ liệu offline" và kiểm tra tính toàn vẹn cache.
- Audio cần user gesture để phát lần đầu; công tắc im lặng có thể làm tắt tiếng Web Audio → dùng `<audio>` / HTMLAudioElement.
- `SpeechRecognition` cần mạng trên iOS → không đưa vào tính năng cốt lõi offline.
- Dung lượng: giữ tổng audio < ~50–100MB giai đoạn đầu (m4a/aac mono 48–64kbps).
