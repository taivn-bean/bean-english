# Discovery questions

Trả lời ngay dưới mỗi câu (dòng `> A:`). Câu nào chưa nghĩ ra thì để trống, sẽ dùng đề xuất mặc định (in nghiêng).

## A. Người dùng & cách dùng
1. **Ai cầm điện thoại chủ yếu?** Chỉ ba mẹ dùng (đọc rồi nói với bé), hay bé cũng tự bấm nghe/xem?
   _Mặc định: ba mẹ là người dùng chính, có 1 chế độ "cho bé bấm" đơn giản._
   > A:
2. **Bối cảnh dùng điển hình?** Mở nhanh ngay lúc đang tắm/cho ăn (cần 2–3 chạm là ra câu), hay ngồi học trước buổi tối rồi mới áp dụng?
   > A:
3. **Chỉ gia đình mình dùng, hay muốn chia sẻ cho bạn bè / cộng đồng?** (ảnh hưởng tới đăng nhập, domain, chi phí)
   _Mặc định: chỉ gia đình, không đăng nhập._
   > A:
4. **Có nhiều bé / nhiều hồ sơ không?** (ví dụ sau này có thêm em bé, cần theo dõi riêng từng bé)
   > A:

## B. Nội dung
5. **Danh sách chủ đề giai đoạn 1?** Gợi ý: thức dậy, đánh răng, ăn uống, tắm, mặc đồ, đi chơi, đồ chơi, màu sắc, con vật, cảm xúc, khen ngợi, đi ngủ, an toàn ("Hot! Don't touch"). Vợ bạn muốn thêm/bớt gì?
   > A:
6. **Bao nhiêu câu cho bản đầu?** (ví dụ 10 chủ đề × 15 câu + 2 hội thoại/chủ đề)
   > A:
7. **Ai soạn nội dung?** Để Claude soạn hết rồi vợ bạn duyệt, hay vợ bạn đã có sẵn danh sách câu (file Excel/Notes/sách)?
   > A:
8. **Giọng Anh-Mỹ hay Anh-Anh?** Có muốn giọng nam/nữ khác nhau cho vai "ba/mẹ" và "bé" trong hội thoại không?
   _Mặc định: Anh-Mỹ, giọng nữ cho người lớn, giọng trẻ em nếu tìm được nguồn phù hợp._
   > A:
9. **Có cần phiên âm hỗ trợ không?** IPA chuẩn, phiên âm "kiểu Việt" (ví dụ "Lét tếch ơ ba:th"), hay chỉ cần audio + chế độ đọc chậm?
   > A:
10. **Có muốn mẫu câu dạng "cấu trúc thay từ"** (ví dụ `Do you want ___?` + apple / milk / water) để ba mẹ tự ghép câu mới?
    > A:

## C. Tính năng
11. **Những tính năng nào là bắt buộc ở bản đầu?** (chọn)
    - [ ] Duyệt theo chủ đề + nghe audio
    - [ ] Phát chậm / lặp lại
    - [ ] Yêu thích / "câu của hôm nay"
    - [ ] Tìm kiếm (gõ tiếng Việt ra câu tiếng Anh)
    - [ ] Chế độ hội thoại (phát lần lượt từng vai)
    - [ ] Flashcard / mini game có hình cho bé
    - [ ] Ghi âm giọng ba mẹ để so sánh (offline được; *chấm điểm phát âm thì KHÔNG offline được trên iPhone*)
    - [ ] Nhắc nhở hằng ngày (Web Push trên iOS cần mạng + đã cài lên màn hình chính)
    > A:
12. **Có cần hình minh hoạ không?** Emoji là đủ, hay muốn tranh minh hoạ (tự vẽ / AI-gen / ảnh)? Tranh làm app nặng hơn khi offline.
    > A:
13. **Theo dõi tiến độ?** Có cần biết "đã học câu nào, bé đã nói được câu nào", hay chỉ cần đánh dấu yêu thích?
    > A:
14. **Đồng bộ giữa 2 điện thoại (ba và mẹ)?** Nếu cần thì phải có backend nhỏ (Cloudflare D1/KV) — ngoài phạm vi "full offline" thuần.
    _Mặc định: không đồng bộ; có nút xuất/nhập file backup._
    > A:

## D. Giao diện & thương hiệu
15. **Tên app "Bean English" đã chốt chưa?** Có màu sắc / nhân vật linh vật (ví dụ hạt đậu "Bean") mong muốn?
    > A:
16. **Ngôn ngữ giao diện** chỉ tiếng Việt, hay song ngữ?
    > A:

## E. Kỹ thuật & triển khai
17. **Đã có tài khoản Cloudflare và domain chưa?** Dùng `*.pages.dev` / `*.workers.dev` miễn phí là được, hay muốn domain riêng?
    > A:
18. **Ngân sách cho TTS?** Có chịu trả một khoản nhỏ một lần cho dịch vụ TTS chất lượng cao (Google/Azure/ElevenLabs), hay chỉ dùng miễn phí (giọng macOS `say`, Piper TTS)?
    > A:
19. **Dung lượng chấp nhận được** trên iPhone cho bản offline? (ví dụ < 50MB / < 200MB)
    > A:
20. **Mốc thời gian mong muốn** có bản dùng thử đầu tiên?
    > A:
