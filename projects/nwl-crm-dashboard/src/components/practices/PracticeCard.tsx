import { Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn, fmt, formatDate } from '@/lib/utils'
import type { PCNPractice } from '@/lib/types'

interface PracticeCardProps {
  practice: PCNPractice
  isCurrent?: boolean
  uploadDate?: string // ISO, only for current
  totalRevenue?: number
  securedRevenue?: number
  atRiskRevenue?: number
  weekNumber?: number
  className?: string
}

export function PracticeCard({
  practice,
  isCurrent = false,
  uploadDate,
  totalRevenue,
  securedRevenue,
  atRiskRevenue,
  weekNumber,
  className,
}: PracticeCardProps) {
  const hasData = isCurrent && uploadDate && typeof totalRevenue === 'number'
  const securedPct =
    hasData && totalRevenue > 0 ? (securedRevenue! / totalRevenue) * 100 : 0
  const atRiskPct =
    hasData && totalRevenue > 0 ? (atRiskRevenue! / totalRevenue) * 100 : 0

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm',
        isCurrent ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md',
              isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{practice.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              ODS: {practice.ods ?? '—'}
            </p>
          </div>
        </div>
        {isCurrent ? (
          <Badge variant="info">This practice</Badge>
        ) : (
          <Badge variant="neutral">Data pending</Badge>
        )}
      </div>

      {hasData ? (
        <>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
              Annual ceiling
            </p>
            <p className="text-xl font-extrabold tabular-nums text-foreground">
              {fmt(totalRevenue!, { currency: true })}
            </p>
            <p className="text-xs text-muted-foreground">
              Week {weekNumber} · updated {formatDate(uploadDate!)}
            </p>
          </div>

          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-success">Secured</span>
              <span className="tabular-nums font-semibold text-foreground">
                {fmt(securedRevenue!, { currency: true })} · {securedPct.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-destructive">At Risk</span>
              <span className="tabular-nums font-semibold text-foreground">
                {fmt(atRiskRevenue!, { currency: true })} · {atRiskPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            {isCurrent
              ? 'Upload a CSV to populate KPI and revenue figures.'
              : 'No CSV connected yet. PCN-level aggregation is a Phase 2 feature.'}
          </p>
        </div>
      )}
    </div>
  )
}
