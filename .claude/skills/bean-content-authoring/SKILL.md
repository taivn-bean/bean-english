---
name: bean-content-authoring
description: Write and review Bean English learning content — natural, real-life English phrases and parent–child dialogues for children aged 3–9 (age bands 3-5, 5-7, 7-9), with natural Vietnamese meanings, swap-word slots, levels and age tags, as schema-valid JSON. Use when creating, expanding, translating, re-tagging or reviewing anything under content/.
---

# Bean English content authoring

Audience: a Vietnamese parent with weak spoken English reads/listens, then says it to their child **right now, in a real situation**. Every line must be something a native English-speaking parent (US) or child would actually say at home — not textbook English.

Schema: `.claude/docs/content-schema.md`. Files: `content/topics.json` (topic list), `content/topics/<topicId>.json` (phrases + dialogues). Validate with `node scripts/build-content.mjs` (must print ✓; missing-audio warnings are expected).

## Format rules
- Phrase speakers: `parent | child`. Dialogue line speakers: `mom | dad | child`.
- Slot phrases: exactly one `___` in both `en` and `vi`, 3–6 slots, slot[0] = default; every filled sentence must be grammatical and natural in BOTH languages (move a changing Vietnamese verb/classifier into the slot's `vi`, e.g. "ăn cơm" / "uống sữa").
- `ages`: required on every phrase and dialogue — one or more of `"3-5"`, `"5-7"`, `"7-9"`. Tag every band where the line genuinely fits (a greeting may fit all three; "Arms up!" is 3-5 only). Topics appear for a band when they have content for it.
- `level`: 1 = 1–3 words, 2 = 4–6 words, 3 = 7+ words (count the default-slot sentence).
- Adding slots to an existing phrase is fine (append or insert anywhere): only clips with new text get rendered; identical sentences reuse existing audio.
- IDs continue the file's numbering (`<topicId>-NNN`, `<topicId>-dNN`); never renumber, reuse or edit existing ids.
- Add `"ipa"` only when the build reports an unknown word (slot-level `ipa` = IPA of the whole filled sentence).
- One adult TTS voice reads everything, so parent phrases' Vietnamese must not call the speaker "mẹ"/"ba" (use "mình", or no subject); dialogue lines may.

## Age bands
| | 3-5 | 5-7 | 7-9 |
|---|---|---|---|
| Parent lines | 1–8 words; routines, simple commands, naming, praise | up to ~12 words; questions about their day, simple reasons (because/so), choices, gentle rules | full natural sentences; opinions, plans, responsibility, feelings in depth, problem-solving |
| Child lines | 1–3 words ("More, please!", "All done!") | short sentences, past tense ("I played with Minh.") | full sentences, reasons, opinions ("I think it's unfair because…") |
| Grammar | present, imperatives | + past simple, can/can't, want to | + future (going to/will), comparatives, should, if-clauses |
| Dialogues | 4–8 lines | 6–10 lines | 8–12 lines |
| Themes | body, routines, colors, animals | school readiness, friends, games & rules, letters, time, "why?" | homework, hobbies, friendships, screens, money, weekend plans, storytelling |

## Naturalness (most important)
1. **Say it out loud test:** would a native parent in the US say exactly this to a child of that age at home? If it sounds like a textbook, rewrite it.
2. Use real spoken features: contractions (let's, it's, don't, you're), discourse markers (Okay, Alright, Oh no, Uh-oh, Hmm, Wow, Hey, Actually), tags (…okay?, …right?), softeners (Can you…, How about…, Let's…).
3. Prefer high-frequency, reusable chunks over rare words: "Hang on a sec.", "What happened?", "That's not okay.", "Nice try!", "How was school?", "What's up, buddy?".
4. No idioms the parent cannot explain unless very common in family life ("Rise and shine!" ok); give the meaning, not a literal translation, in `vi`.
5. Dialogues must feel like a real moment: a clear situation, natural turn-taking, the child sometimes resists/asks/jokes, the parent responds warmly; end with a resolution. Avoid both speakers just exchanging set phrases.
6. Vietnamese (`vi`): what a Vietnamese parent would naturally say in that moment (Southern style already used: ba, mẹ, con, nha, nè, nào, mền). Never word-by-word.
7. Tone: warm, respectful, positive discipline — every "no" comes with what to do instead. Nothing scary, shaming or sarcastic.

## Coverage per topic (new topics)
- ~30 phrases (~65% parent / 35% child), ≥25% with slots, mixed levels, all tagged with the band(s).
- 5 dialogues, different situations, both parents appear across them.
- Adding a band to an existing topic: ~6–8 phrases + 1–2 dialogues for that band, continuing ids.

## Review checklist (run before finishing)
- [ ] Every line passes the say-it-out-loud test for its band(s)
- [ ] `vi` natural, matches intent and register
- [ ] `ages` present and honest; level matches length
- [ ] No English phrase duplicated anywhere in content/topics/*.json (case/punctuation-insensitive; grep before finalizing)
- [ ] `node scripts/build-content.mjs` prints ✓, no unknown IPA words left in your files
- [ ] Report new/changed ids (audio is generated by `pnpm audio` into a new patch)
