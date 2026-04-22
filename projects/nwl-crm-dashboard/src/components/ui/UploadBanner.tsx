import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Accent = 'info' | 'success' | 'warning' | 'destructive'

interface UploadBannerProps {
  accent?: Accent
  title: string
  children?: ReactNode
  right?: ReactNode
  className?: string
}

const ACCENT_STRIPE: Record<Accent, string> = {
  info:        'bg-primary',
  success:     'bg-success',
  warning:     'bg-warning',
  destructive: 'bg-destructive',
}

export function UploadBanner({
  accent = 'info',
  title,
  children,
  right,
  className,
}: UploadBannerProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card pl-4 pr-5 py-4 shadow-sm',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-1', ACCENT_STRIPE[accent])}
      />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {children ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{children}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  )
}
