// Child avatar: a friendly animal face on a colored circle, plus an optional accessory.
// Pure inline SVG (no images) so it works offline and stays crisp at any size.
import type { AvatarAccessory, AvatarAnimal, AvatarConfig } from '@/shared/db'

export const AVATAR_ANIMALS: AvatarAnimal[] = ['cat', 'dog', 'bunny', 'bear', 'panda', 'fox']
export const AVATAR_ACCESSORIES: AvatarAccessory[] = ['none', 'bow', 'glasses', 'party-hat', 'crown']
export const AVATAR_COLORS = ['#7cc576', '#f2a65a', '#6aa9e9', '#e57fa8', '#a58be0', '#e0c04d', '#5fc4b8', '#f08a8c']

export const DEFAULT_AVATAR: AvatarConfig = { animal: 'cat', accessory: 'none' }

const FACE: Record<AvatarAnimal, { fur: string; inner: string; muzzle: string }> = {
  cat: { fur: '#f6dfb8', inner: '#f7b6b8', muzzle: '#fff8ec' },
  dog: { fur: '#d9a066', inner: '#a8703f', muzzle: '#fbe9d4' },
  bunny: { fur: '#f4f1ee', inner: '#f7c6c7', muzzle: '#ffffff' },
  bear: { fur: '#a9785a', inner: '#7d5641', muzzle: '#e6c9a8' },
  panda: { fur: '#ffffff', inner: '#2d2d2d', muzzle: '#ffffff' },
  fox: { fur: '#f29a4a', inner: '#ffffff', muzzle: '#fff4e8' },
}

function Ears({ animal }: { animal: AvatarAnimal }) {
  const { fur, inner } = FACE[animal]
  switch (animal) {
    case 'cat':
    case 'fox':
      return (
        <>
          <path d="M22 44 L26 14 L46 32 Z" fill={fur} />
          <path d="M78 44 L74 14 L54 32 Z" fill={fur} />
          <path d="M28 38 L30 22 L41 32 Z" fill={inner} />
          <path d="M72 38 L70 22 L59 32 Z" fill={inner} />
        </>
      )
    case 'dog':
      return (
        <>
          <ellipse cx="22" cy="46" rx="10" ry="20" fill={inner} transform="rotate(18 22 46)" />
          <ellipse cx="78" cy="46" rx="10" ry="20" fill={inner} transform="rotate(-18 78 46)" />
        </>
      )
    case 'bunny':
      return (
        <>
          <ellipse cx="37" cy="20" rx="8" ry="20" fill={fur} />
          <ellipse cx="63" cy="20" rx="8" ry="20" fill={fur} />
          <ellipse cx="37" cy="22" rx="4" ry="14" fill={inner} />
          <ellipse cx="63" cy="22" rx="4" ry="14" fill={inner} />
        </>
      )
    case 'bear':
    case 'panda':
      return (
        <>
          <circle cx="28" cy="30" r="11" fill={animal === 'panda' ? inner : fur} />
          <circle cx="72" cy="30" r="11" fill={animal === 'panda' ? inner : fur} />
          {animal === 'bear' && (
            <>
              <circle cx="28" cy="30" r="5" fill={inner} />
              <circle cx="72" cy="30" r="5" fill={inner} />
            </>
          )}
        </>
      )
  }
}

function Accessory({ kind }: { kind: AvatarAccessory }) {
  switch (kind) {
    case 'bow':
      return (
        <g transform="translate(68 30)">
          <path d="M0 0 L-12 -7 L-12 7 Z M0 0 L12 -7 L12 7 Z" fill="#e5487a" />
          <circle r="3.5" fill="#c9305f" />
        </g>
      )
    case 'glasses':
      return (
        <g fill="none" stroke="#2b2b2b" strokeWidth="2.5">
          <circle cx="39" cy="53" r="8" />
          <circle cx="61" cy="53" r="8" />
          <path d="M47 53 L53 53" />
        </g>
      )
    case 'party-hat':
      return (
        <g>
          <path d="M50 4 L38 30 L62 30 Z" fill="#6aa9e9" />
          <path d="M44 17 L56 17 M41 24 L59 24" stroke="#ffffff" strokeWidth="2.5" />
          <circle cx="50" cy="4" r="4" fill="#f5c242" />
        </g>
      )
    case 'crown':
      return <path d="M34 28 L36 12 L44 21 L50 9 L56 21 L64 12 L66 28 Z" fill="#f5c242" stroke="#d9a21b" strokeWidth="1.5" />
    default:
      return null
  }
}

type Props = { avatar?: AvatarConfig; color?: string; size?: number; className?: string; title?: string }

export function Avatar({ avatar = DEFAULT_AVATAR, color = '#7cc576', size = 48, className, title }: Props) {
  const { animal, accessory } = avatar
  const { fur, muzzle } = FACE[animal]
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={title ?? animal}>
      <circle cx="50" cy="50" r="50" fill={color} />
      <Ears animal={animal} />
      <ellipse cx="50" cy="58" rx="32" ry="28" fill={fur} stroke={animal === 'panda' || animal === 'bunny' ? '#e4e0dc' : 'none'} />
      {animal === 'panda' && (
        <>
          <ellipse cx="39" cy="54" rx="8" ry="10" fill="#2d2d2d" transform="rotate(-20 39 54)" />
          <ellipse cx="61" cy="54" rx="8" ry="10" fill="#2d2d2d" transform="rotate(20 61 54)" />
        </>
      )}
      <ellipse cx="50" cy="68" rx="15" ry="11" fill={muzzle} />
      <circle cx="39" cy="54" r="4" fill={animal === 'panda' ? '#ffffff' : '#22412a'} />
      <circle cx="61" cy="54" r="4" fill={animal === 'panda' ? '#ffffff' : '#22412a'} />
      <circle cx="40.5" cy="52.5" r="1.3" fill={animal === 'panda' ? '#22412a' : '#ffffff'} />
      <circle cx="62.5" cy="52.5" r="1.3" fill={animal === 'panda' ? '#22412a' : '#ffffff'} />
      <ellipse cx="50" cy="64" rx="4" ry="3" fill="#3a2a2a" />
      <path d="M50 67 Q46 73 42 71 M50 67 Q54 73 58 71" stroke="#3a2a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="31" cy="66" r="4" fill="#f7a8b0" opacity=".6" />
      <circle cx="69" cy="66" r="4" fill="#f7a8b0" opacity=".6" />
      <Accessory kind={accessory} />
    </svg>
  )
}
