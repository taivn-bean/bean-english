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
      "level": 1,                    // 1: 1–3 từ, 2: 4–6 từ, 3: 7+ từ
      "ages": ["3-5"],               // nhóm tuổi phù hợp: "3-5" | "5-7" | "7-9" (1 hoặc nhiều)
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
      "ages": ["3-5", "5-7"],
      "lines": [                      // 4–8 dòng; line id tự sinh = <dialogueId>-l<n>
        { "speaker": "mom",   "en": "Good morning! Are you hungry?", "vi": "Chào buổi sáng! Con đói chưa?" },
        { "speaker": "child", "en": "Yes!", "vi": "Dạ có!" },
        { "speaker": "dad",   "en": "Let's eat!", "vi": "Mình ăn thôi!" }
      ]
    }
  ]
}
```
- Chủ đề hiện ở nhóm tuổi nào = hợp các `ages` của câu trong chủ đề. Quy tắc theo tuổi: skill `bean-content-authoring`.
- Mỗi chủ đề: **≥20 phrases** (~70% parent, ~30% child), **≥25% câu có `slots`**, **≥2 dialogues**. Thêm câu mới thì nối tiếp id, không đánh số lại.
- `ipa` tuỳ chọn trên phrase / dialogue line / slot (slot: IPA của cả câu đã điền): chỉ điền khi muốn ghi đè IPA tự sinh (từ CMU dict).

## Audio (sinh tự động) — gói bất biến: base theo chủ đề + patch theo đợt (D26)
Mỗi câu = 1 clip, key = `<uttId>` (phrase → `<phraseId>`, slot → `<phraseId>-s<n>`, dialogue → `<dialogueId>-l<n>`). Một giọng cho mọi câu (`scripts/voices.json`).

```
audio/packs/base-<topicId>-<hash>.bin   1 gói/chủ đề, tạo bởi compact
audio/packs/patch-<NNN>-<hash>.bin      1 gói/đợt cập nhật: mọi clip mới/đổi, mọi chủ đề (≤3MB)
audio/packs/patch-<NNN>-<topic>-<hash>.bin  đợt lớn >3MB: tách theo chủ đề (tải offline theo chủ đề vẫn nhỏ)
audio/packs.json                        sổ cái: key → { hash (text+voice+pipeline), pack, range:[off,len] }
```
- Gói **không bao giờ bị ghi lại** → user chỉ tải patch mới. Clip đổi/xoá để lại byte chết.
- **Tái sử dụng theo nội dung:** clip trùng câu chữ + giọng với clip đã có (thêm/chèn/đổi thứ tự slot, chuyển câu sang chủ đề khác) được trỏ tới byte cũ, không sinh lại. Thêm slot mới → chỉ clip mới vào patch.
- `pnpm audio`: sinh clip mới/đổi → **1 patch**. `pnpm audio:compact`: dựng lại base sạch (user tải lại toàn bộ 1 lần) — nên chạy khi >5 patch hoặc >25% byte chết (script tự nhắc).
- Gói + `packs.json` được commit; `audio/.staging/` (clip tạm, cho phép chạy tiếp khi bị ngắt) thì không.
- App: SW **không** precache gói; người dùng chọn chủ đề → `src/features/offline/offline.ts` tải các gói chủ đề cần (base + patch) vào cache `bean-audio-v1`, khi khởi động tự tải patch mới & xoá gói thừa.
- Build copy các gói đang dùng sang `public/audio-packs/`; topic JSON có `audio: { packs: [url], index: { key: [packIdx, off, len] } }`; app cắt Blob theo range để phát.

## Flash-card từ vựng (D31)
`content/vocab.json` = danh sách bộ thẻ (giống topics.json, id bắt đầu `v-`). `content/vocab/<deckId>.json`:
```jsonc
{
  "deckId": "v-animals",
  "words": [
    {
      "id": "v-animals-001",        // <deckId>-NNN, không đổi/tái sử dụng
      "en": "dog",                  // từ gốc (≤3 từ), viết thường trừ tên riêng
      "vi": "con chó",
      "pos": "noun",                // noun|verb|adjective|adverb|preposition|pronoun|number|phrase|other
      "emoji": "🐶",                // tuỳ chọn: chỉ khi emoji vẽ đúng nghĩa; không có → app hiện icon bộ thẻ
      "ages": ["3-5", "5-7"],
      "examples": [                 // đúng 5 câu, đa dạng mẫu câu, mỗi câu chứa từ (hoặc dạng biến thể: dogs, ran…)
        { "en": "Look, a dog!", "vi": "Nhìn kìa, con chó!" }
      ]
    }
  ]
}
```
- Audio key: từ = `<wordId>`, câu ví dụ = `<wordId>-e<1..5>`. Gói audio theo bộ thẻ (`base-v-<deck>-*.bin`), tải offline theo bộ thẻ.
- Mỗi từ tiếng Anh (theo nghĩa) chỉ xuất hiện ở **một** bộ thẻ; build báo trùng.
