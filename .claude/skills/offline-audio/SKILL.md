---
name: offline-audio
description: Generate and manage pre-rendered TTS audio for Bean English phrases and dialogue lines at build time — engine options (macOS say, Piper, cloud TTS), incremental regeneration by hash, ffmpeg normalization/compression to small AAC files, and coverage checks that every content id has audio. Use when adding content, changing voices, or auditing audio size/quality.
---

# Offline audio pipeline

Output: immutable packs in `audio/packs/` (per-topic `base-*` + per-update `patch-*`) and ledger `audio/packs.json`. Full layout and rules: `.claude/docs/content-schema.md` § Audio. Logic: `scripts/lib/packs.mjs`.

## Engines (pick per product-brief decision)
| Engine | Cost | Quality | Notes |
|---|---|---|---|
| macOS `say` (e.g. `-v Samantha`, or downloaded Premium/Enhanced voices) | free, offline | good | `say -v Samantha -r 160 -o out.aiff "text"`; check voices with `say -v '?'`; personal-use only |
| Piper TTS (open source, `en_US-*` voices) | free, offline | good | check each voice model's license before sharing publicly |
| Google Cloud / Azure TTS (neural) | small one-time cost | very good | SSML for rate/pauses; key via env var `TTS_API_KEY` |
| ElevenLabs | paid | most natural / child-like | review terms for child voices |

**Current choice (D25): Kokoro-82M via `kokoro-js` (local, Apache-2.0), voice `af_heart`, one voice for all clips.** ~0.5× realtime on CPU (≈3s per 6s of audio). Other US voices: af_bella, af_sarah, am_michael, am_adam. Fallback engine: macOS `say` (`"engine": "say"`).

## Script: `scripts/gen-audio.mjs` (`pnpm audio`)
1. `build-content` writes `scripts/.generated/utterances.json` (key, text, topicId).
2. Clip hash = sha1(PIPELINE + voices.json + text). Render only clips whose hash differs from the ledger.
3. Render → WAV → `afconvert -d aach -b 24000 -c 1` (HE-AAC 24k mono) into `audio/.staging/` (resumable).
4. Staged clips → ONE new `patch-NNN` pack. First run / `--compact` / `--force` → per-topic `base-*` packs.
5. Packs no clip points to are deleted; the script suggests compaction at >5 patches or >25% dead bytes.
6. `build-content` (again) copies used packs to `public/audio-packs/` and writes per-topic indexes.

## Coverage check: `pnpm content:check`
Fails if any clip key is missing from the ledger.

## Rules
- Never put API keys in repo; `.env` is gitignored.
- Keep total under budget in product-brief (default target ≤ 50MB).
- Listen-test a random 10% sample after changing engine/voice; note findings in the PR/summary.
