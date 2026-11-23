---
name: offline-audio
description: Generate and manage pre-rendered TTS audio for Bean English phrases and dialogue lines at build time — engine options (macOS say, Piper, cloud TTS), incremental regeneration by hash, ffmpeg normalization/compression to small AAC files, and coverage checks that every content id has audio. Use when adding content, changing voices, or auditing audio size/quality.
---

# Offline audio pipeline

Output: `public/audio/<id>.m4a` (+ optional `<id>.slow.m4a`), manifest `public/audio/manifest.json` = `{ id: { hash, bytes, durationMs } }`.

## Engines (pick per product-brief decision)
| Engine | Cost | Quality | Notes |
|---|---|---|---|
| macOS `say` (e.g. `-v Samantha`, or downloaded Premium/Enhanced voices) | free, offline | good | `say -v Samantha -r 160 -o out.aiff "text"`; check voices with `say -v '?'`; personal-use only |
| Piper TTS (open source, `en_US-*` voices) | free, offline | good | check each voice model's license before sharing publicly |
| Google Cloud / Azure TTS (neural) | small one-time cost | very good | SSML for rate/pauses; key via env var `TTS_API_KEY` |
| ElevenLabs | paid | most natural / child-like | review terms for child voices |

Default if undecided: macOS `say` with an enhanced en-US voice for adults; a different voice for child lines.

## Script: `scripts/gen-audio.mjs` (`pnpm audio`; incremental manifest in `scripts/audio-manifest.json`; coverage check = `pnpm content:check`)
1. Load + validate all content (same Zod schema as the app).
2. For each phrase / dialogue line compute `hash = sha1(engine + voice + rate + text)`.
3. Skip if manifest hash matches and file exists (incremental).
4. Render → temp AIFF (`say`) → `afconvert -f m4af -d aac -b 32000 -c 1` (built into macOS; say's own m4a output has ~30KB padding/file). Optional ffmpeg chain if installed:
   `ffmpeg -y -i in.aiff -af "silenceremove=start_periods=1:start_threshold=-50dB,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.15" -ac 1 -ar 44100 -c:a aac -b:a 56k out.m4a`
5. Slow variant: render at lower rate in the engine (better than time-stretching), same ffmpeg chain.
6. Delete orphan files whose id no longer exists (print list first).
7. Print summary: generated / skipped / deleted / total MB.

## Coverage check: `npm run audio:check`
Fails CI/build if any content id lacks audio or manifest hash is stale.

## Rules
- Never put API keys in repo; `.env` is gitignored.
- Keep total under budget in product-brief (default target ≤ 50MB).
- Listen-test a random 10% sample after changing engine/voice; note findings in the PR/summary.
