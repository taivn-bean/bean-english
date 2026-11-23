import {
  Bath, Blocks, Car, CloudSun, Hand, HandHeart, Hash, Heart, type LucideIcon, type LucideProps, Moon, Palette, PawPrint,
  ShieldCheck, Shirt, ShoppingCart, Smile, Sparkles, Sunrise, Thermometer, Toothbrush, Trees, Utensils,
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
  'hand-heart': HandHeart,
  hand: Hand,
  'paw-print': PawPrint,
  palette: Palette,
  hash: Hash,
  'cloud-sun': CloudSun,
  car: Car,
  'shopping-cart': ShoppingCart,
  thermometer: Thermometer,
  sparkles: Sparkles,
}

export function TopicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Smile
  return <Icon {...props} />
}
