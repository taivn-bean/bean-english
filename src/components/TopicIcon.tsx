import {
  Bath, Blocks, Heart, type LucideIcon, type LucideProps, Moon, ShieldCheck, Shirt, Smile, Sunrise, Toothbrush, Trees, Utensils,
} from 'lucide-react'

// Explicit map keeps the bundle small (no dynamic import of all icons). Add new topic icons here.
const ICONS: Record<string, LucideIcon> = {
  sunrise: Sunrise,
  toothbrush: Toothbrush,
  utensils: Utensils,
  shirt: Shirt,
  blocks: Blocks,
  trees: Trees,
  heart: Heart,
  'shield-check': ShieldCheck,
  bath: Bath,
  moon: Moon,
}

export function TopicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Smile
  return <Icon {...props} />
}
