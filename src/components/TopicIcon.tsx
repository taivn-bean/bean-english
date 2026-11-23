import {
  Bath, Blocks, Car, CircleQuestionMark, CloudSun, Hand, HandHeart, Hash, Heart, type LucideIcon, type LucideProps, MessageCircleMore, Moon, Palette, PawPrint,
  ShieldCheck, Shirt, ShoppingCart, Smile, Sparkles, Sunrise, Thermometer, Toothbrush, Trees, Utensils,
  School, BookA, CalendarClock, Users, Dice5, Lightbulb, NotebookPen, Trophy, Handshake, TabletSmartphone, CalendarDays, MessageSquareQuote, PiggyBank,
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
  'message-circle-more': MessageCircleMore,
  'circle-question-mark': CircleQuestionMark,
  'school': School,
  'book-a': BookA,
  'calendar-clock': CalendarClock,
  'users': Users,
  'dice-5': Dice5,
  'lightbulb': Lightbulb,
  'notebook-pen': NotebookPen,
  'trophy': Trophy,
  'handshake': Handshake,
  'tablet-smartphone': TabletSmartphone,
  'calendar-days': CalendarDays,
  'message-square-quote': MessageSquareQuote,
  'piggy-bank': PiggyBank,
}

export function TopicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Smile
  return <Icon {...props} />
}
