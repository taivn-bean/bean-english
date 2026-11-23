---
name: kid-friendly-ui
description: UX and visual design rules for Bean English screens used by Vietnamese parents in the middle of daily routines with a toddler, plus an optional child tap mode — big touch targets, one-handed use, ≤3 taps to a phrase, readable EN/VI typography, playful but calm visuals, accessibility. Use when designing or building any screen or component.
---

# Parent-and-toddler UX rules

## Context of use
Parent holds a phone with one hand while bathing/feeding the child. Attention lasts seconds.
→ **≤3 taps from launch to hearing a phrase.** Home = grid of situations (emoji + VI title).

## Layout
- One-handed: primary actions in the bottom 50% of the screen; bottom tab bar (Chủ đề / Yêu thích / Hội thoại / Cài đặt).
- Touch targets ≥ 48×48pt (child mode ≥ 80pt), 8pt+ spacing.
- Respect safe areas (`env(safe-area-inset-*)`), support portrait first.

## Phrase card
- EN text large (≥ 22px, weight 600), VI below smaller and muted, optional pronunciation hint smallest.
- Whole card tappable = play. Secondary buttons: 🐢 slow, 🔁 repeat ×3, ⭐ favorite.
- Pattern phrases show the blank highlighted with slot chips to swap words.
- Visual feedback while playing (pulse/highlight); never block UI.

## Child mode
- Full-screen big emoji/picture buttons, plays audio on tap, no text needed, no way to navigate out except a long-press (≥1.5s) parent exit.
- No ads, no external links, no purchase prompts anywhere.

## Visual language
- Warm, soft palette (cream background, bean-green/peach accents), rounded 16–24px corners, emoji or simple flat illustrations.
- Calm: no flashing, no autoplay sound on screen open, gentle animations (≤300ms, respect `prefers-reduced-motion`).
- Support light/dark (night bedtime use → dark mode is important).

## Copy
- UI text in Vietnamese, friendly and short ("Nghe lại", "Đọc chậm", "Đã thuộc").
- Empty states give a next action ("Chưa có câu yêu thích — bấm ⭐ ở câu bất kỳ").

## Accessibility
- Contrast ≥ 4.5:1 for text, Dynamic Type friendly (rem units), `aria-label` on icon buttons, `lang="en"` on English text spans (correct VoiceOver pronunciation).
