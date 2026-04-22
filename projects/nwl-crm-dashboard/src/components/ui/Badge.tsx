import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'success' | 'destructive' | 'warning' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success:     'bg-success/10 text-success border-success/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  warning:     'bg-warning/15 text-warning border-warning/25',
  info:        'bg-primary/10 text-primary border-primary/20',
  neutral:     'bg-muted text-muted-foreground border-border',
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.5px]',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
