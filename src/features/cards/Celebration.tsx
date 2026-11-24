
const COLORS = ['#7cc576', '#f2a65a', '#6aa9e9', '#e57fa8', '#f5c242', '#a58be0']

/** Deterministic pseudo-random 0..1 per (piece, channel): pure render, still looks scattered. */
const rand = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Short CSS-only confetti burst (no library, works offline; hidden with reduced motion). */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const bits = Array.from({ length: pieces }, (_, i) => ({
    left: rand(i, 1) * 100,
    delay: rand(i, 2) * 0.6,
    duration: 1.8 + rand(i, 3) * 1.4,
    size: 6 + rand(i, 4) * 6,
    color: COLORS[i % COLORS.length],
    round: rand(i, 5) > 0.5,
  }))
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden motion-reduce:hidden" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti-bit absolute -top-4"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.round ? b.size : b.size * 1.6,
            background: b.color,
            borderRadius: b.round ? '50%' : 2,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
