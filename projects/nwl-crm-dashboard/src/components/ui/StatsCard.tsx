import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AccentColor = 'gradient' | 'green' | 'red' | 'blue'

interface StatsCardProps {
  label: string
  value: string
  sub?: string
  badge?: ReactNode
  accentColor?: AccentColor
  className?: string
}

const ACCENT_BG: Record<AccentColor, string> = {
  gradient: 'bg-brand-gradient',
  green:    'bg-success',
  red:      'bg-destructive',
  blue:     'bg-primary',
}

export function StatsCard({
  label,
  value,
  sub,
  badge,
  accentColor = 'gradient',
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card p-[18px] shadow-md',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('absolute inset-x-0 top-0 h-[3px]', ACCENT_BG[accentColor])}
      />
      <div className="flex items-start justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          {label}
        </p>
        {badge}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}
