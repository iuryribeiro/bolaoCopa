import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'live'
  className?: string
}

const variants = {
  default: 'bg-white/10 text-white',
  green: 'bg-green-500/20 text-green-400 border border-green-500/30',
  red: 'bg-red-500/20 text-red-400 border border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  gray: 'bg-white/5 text-gray-400',
  live: 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
      )}
      {children}
    </span>
  )
}
