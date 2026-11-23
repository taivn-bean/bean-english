---
name: bean-content-authoring
description: Write and review Bean English learning content — topic-based English phrases and short parent–child dialogues for a 3-year-old, with natural Vietnamese meanings, reusable sentence patterns, and levels, as schema-valid JSON. Use when creating, expanding, translating, or reviewing anything under content/.
---

# Bean English content authoring

Schema: `.claude/docs/content-schema.md`. Files: `content/topics.json` (topic list), `content/topics/<topicId>.json` (phrases + dialogues). Speakers: phrases `parent|child`; dialogue lines `mom|dad|child`. Slot phrases use exactly one `___` in both en and vi.

## Writing rules (English)
1. **Child-directed speech**: short (level 1: 1–3 words, level 2: 4–6 words, level 3: ≤10 words), present tense, concrete, warm.
   Good: "Arms up!", "Time for bath!", "Where's your nose?", "Gentle, please.", "You did it!"
   Avoid: idioms the parent can't explain, sarcasm, complex tenses, rare vocabulary, anything a native parent wouldn't actually say.
2. Prefer **routines** and **repeatable frames**: `Let's ___!`, `Do you want ___?`, `Where is ___?`, `Can you ___?`, `It's ___!`, `I see a ___.`
   Write the frame with `___` in `en`/`vi` and 3–6 safe substitutions in `slots` (slot[0] = default).
3. Each topic mixes: instructions (parent), questions (parent), praise/feelings (parent), and **simple answers the child can say** (`speaker: "child"`: "Yes!", "More, please.", "All done!").
4. Safety & tone: no scary/negative shaming phrases. "No" phrases should be paired with a positive alternative ("Hot! Don't touch." → "Let's wait.").
5. American English spelling unless product-brief says otherwise. Use contractions naturally ("Let's", "It's").

## Writing rules (Vietnamese)
- Dịch **ý tự nhiên** như ba mẹ Việt nói với con, không dịch từng chữ. "Arms up!" → "Giơ tay lên nào!"
- Ngắn gọn, có từ đệm thân mật (nào, nha, ơi) khi phù hợp.
- Nếu product-brief bật `pronunciationVi`, viết gợi ý đọc dễ hiểu, không cố thay IPA.

## Dialogues
- 4–8 lines, alternating parent/child, child lines ≤3 words.
- Must reuse phrases/patterns from the same topic (reinforcement), each line has its own stable id `<dialogueId>-l<n>`.

## IDs
- `<topicId>-<3 digit>` for phrases, `<topicId>-d<2 digit>` for dialogues. Never renumber or reuse an id.

## Review checklist (run before finishing)
- [ ] Would a native English-speaking parent say this to a toddler? (if unsure, simplify)
- [ ] VI meaning natural and matches intent
- [ ] Level matches length
- [ ] No duplicate `en` across topics (unless deliberately shared)
- [ ] JSON validates (`npm run content:check` when available)
- [ ] List new/changed ids so audio can be (re)generated
