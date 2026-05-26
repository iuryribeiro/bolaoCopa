import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

export function Card({ children, className, hover, glow }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white/[0.06] backdrop-blur-sm border border-white/[0.13] rounded-xl overflow-hidden',
        hover && 'hover:bg-white/[0.10] hover:border-white/25 transition-all duration-200',
        glow && 'shadow-lg shadow-emerald-500/10',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 py-3 border-b border-white/10', className)}>
      {children}
    </div>
  )
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-4', className)}>
      {children}
    </div>
  )
}
