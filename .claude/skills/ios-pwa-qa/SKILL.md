---
name: ios-pwa-qa
description: QA checklist and automation for Bean English as an offline iPhone home-screen PWA — Playwright WebKit offline tests, precache coverage, audio playback, update flow, storage eviction recovery, plus a Vietnamese manual checklist for a real iPhone. Use before releases and after changes to service worker, caching, content, or audio.
---

# iOS PWA QA

## Automated (on Mac)
1. `npm run build && npm run preview -- --port 4173`
2. Playwright with **webkit** project (closest to iOS Safari):
   - Load `/`, wait for `navigator.serviceWorker.ready`.
   - `context.setOffline(true)` → reload → app renders; navigate to every topic route; open a dialogue.
   - For a sample of phrases: `fetch('/audio/<id>.m4a')` from page returns 200 from cache while offline.
   - Favorites persist across reload (IndexedDB).
3. Precache coverage: parse `dist/sw.js` precache list; assert every id in content has its audio URL included (or is in a downloadable pack, if packs are used).
4. Content + audio checks: `npm run content:check && npm run audio:check`.
5. Lighthouse (`npx lighthouse http://localhost:4173 --preset=desktop --only-categories=performance,accessibility,best-practices`), report scores; fix a11y < 95.
6. Update flow: build v1 → load → build v2 (change a string) → reload → "Cập nhật" banner appears, applying it shows new content.

## Manual checklist on a real iPhone (gửi cho user, tiếng Việt)
- [ ] Mở link bằng **Safari** → Chia sẻ → "Thêm vào MH chính" → icon và tên hiển thị đúng
- [ ] Mở từ icon (không phải Safari), duyệt 2–3 chủ đề, nghe vài câu
- [ ] Bật **Chế độ máy bay** → tắt hẳn app (vuốt lên) → mở lại từ icon → vẫn dùng được, nghe được audio ở chủ đề **chưa từng mở**
- [ ] Gạt **công tắc im lặng** → audio vẫn phát? (ghi lại kết quả)
- [ ] Đang phát audio, khoá màn hình / chuyển app → quay lại không bị lỗi
- [ ] Đánh dấu yêu thích → tắt app → mở lại → vẫn còn
- [ ] Chế độ tối (dark mode) đọc rõ
- [ ] Xoay ngang / iPhone nhỏ (SE) không vỡ layout
- [ ] Sau khi có bản mới: mở app khi có mạng → thấy thông báo cập nhật

## Report format
| Check | Result (PASS/FAIL/NEEDS-DEVICE) | Notes / repro |
