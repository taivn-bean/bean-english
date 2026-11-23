# Content schema

Nguồn nội dung (do agent soạn) nằm ở `content/`. Script `scripts/build-content.mjs` validate (Zod), sinh IPA, và xuất ra
`public/content/` (app fetch qua TanStack Query, service worker precache). File sinh ra KHÔNG sửa tay.

## content/topics.json
```json
[{ "id": "mealtime", "order": 3, "icon": "utensils", "titleEn": "Mealtime", "titleVi": "Giờ ăn" }]
```
`icon` = tên icon lucide (kebab-case).

## content/topics/<topicId>.json
```jsonc
{
  "topicId": "mealtime",
  "phrases": [
    {
      "id": "mealtime-001",          // <topicId>-<3 digits>, không bao giờ đổi/tái sử dụng
      "speaker": "parent",           // "parent" (có audio giọng ba + mẹ) | "child" (giọng bé)
      "level": 1,                    // 1: 1–3 từ, 2: 4–6 từ, 3: ≤10 từ
      "en": "Are you hungry?",
      "vi": "Con đói chưa?"
    },
    {
      "id": "mealtime-002",
      "speaker": "parent",
      "level": 2,
      "en": "Do you want some ___?", // câu mẫu thay từ: đúng MỘT "___" trong cả en và vi
      "vi": "Con muốn ăn ___ không?",
      "slots": [                      // 3–6 lựa chọn, slot[0] là mặc định
        { "en": "rice", "vi": "cơm" },
        { "en": "milk", "vi": "sữa" }
      ]
    }
  ],
  "dialogues": [
    {
      "id": "mealtime-d01",          // <topicId>-d<2 digits>
      "titleEn": "Breakfast time",
      "titleVi": "Bữa sáng",
      "lines": [                      // 4–8 dòng; line id tự sinh = <dialogueId>-l<n>
        { "speaker": "mom",   "en": "Good morning! Are you hungry?", "vi": "Chào buổi sáng! Con đói chưa?" },
        { "speaker": "child", "en": "Yes!", "vi": "Dạ có!" },
        { "speaker": "dad",   "en": "Let's eat!", "vi": "Mình ăn thôi!" }
      ]
    }
  ]
}
```
- Mỗi chủ đề: **20 phrases** (~14 parent, ~6 child), **ít nhất 5 câu có `slots`**, **2 dialogues**.
- `ipa` tuỳ chọn trên phrase/line: chỉ điền khi muốn ghi đè IPA tự sinh (từ CMU dict).

## Audio (sinh tự động)
Một giọng duy nhất cho mọi câu (D23). File `public/audio/<uttId>.m4a`:
- phrase → `<phraseId>`; slot variant → `<phraseId>-s<n>`; dialogue line → `<dialogueId>-l<n>`.
- `speaker` vẫn giữ để hiển thị (nhãn Ba/Mẹ/Bé), không ảnh hưởng audio.
- dialogue line → giọng đúng theo `speaker`.
- Cấu hình giọng: `scripts/voices.json`.
