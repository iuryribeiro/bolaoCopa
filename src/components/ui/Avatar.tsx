import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: { class: 'w-5 h-5', text: 'text-[10px]' },
  sm: { class: 'w-7 h-7', text: 'text-xs' },
  md: { class: 'w-9 h-9', text: 'text-sm' },
  lg: { class: 'w-12 h-12', text: 'text-base' },
  xl: { class: 'w-16 h-16', text: 'text-xl' },
}

export function Avatar({ src, name = '?', size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  if (src) {
    return (
      <div className={cn('relative rounded-full overflow-hidden shrink-0', sizes[size].class, className)}>
        <Image src={src} alt={name} fill className="object-cover" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold shrink-0',
        'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
        sizes[size].class,
        sizes[size].text,
        className
      )}
    >
      {initials}
    </div>
  )
}
