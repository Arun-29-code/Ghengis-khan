import { Badge } from '@/components/ui/Badge'
import { cn, fmt } from '@/lib/utils'
import type { KPIResult, RAGStatus } from '@/lib/types'

interface KPIHBarRowProps {
  result: KPIResult
  className?: string
}

const RAG_BG: Record<RAGStatus, string> = {
  green: 'bg-success',
  amber: 'bg-warning',
  red:   'bg-destructive',
}

const RAG_BADGE: Record<RAGStatus, { variant: 'success' | 'warning' | 'destructive'; label: string }> = {
  green: { variant: 'success',     label: 'On track' },
  amber: { variant: 'warning',     label: 'At risk'  },
  red:   { variant: 'destructive', label: 'Behind'   },
}

// Fixed "finish line" position across all CRM01 bars, regardless of each KPI's
// underlying target %. Reaching t100 fills the bar to this mark; overshoot fills
// the remaining 15% up to 100% of the track.
const TARGET_POSITION_PCT = 85

export function KPIHBarRow({ result, className }: KPIHBarRowProps) {
  const badge = RAG_BADGE[result.ragStatus]
  const hasData = result.denominator > 0

  const progressRatio = result.t100 > 0 ? result.current / result.t100 : 0
  const progressPct = progressRatio * 100
  const fillWidthPct = Math.min(100, Math.max(0, progressRatio * TARGET_POSITION_PCT))

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-[180px_1fr_auto]',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          {result.code}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">
          {result.short}
          {result.isSmallRegister ? (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-warning">
              small
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">{result.label}</p>
      </div>

      <div>
        <div className="relative">
          <div
            className="relative h-3 w-full overflow-hidden rounded-full bg-muted"
            aria-label={`${result.short} progress toward target`}
            role="img"
          >
            <div
              className={cn(
                'h-full transition-[width] duration-500',
                RAG_BG[result.ragStatus],
              )}
              style={{ width: `${fillWidthPct}%` }}
            />
          </div>
          {/* Target "finish line" tick — fixed at the same position across all CRM01 bars.
              Rendered outside the overflow-hidden track so it can extend above/below. */}
          <span
            className="pointer-events-none absolute top-[-3px] h-[calc(100%+6px)] border-l border-dashed border-foreground/70"
            style={{ left: `${TARGET_POSITION_PCT}%` }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute top-[-14px] -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ left: `${TARGET_POSITION_PCT}%` }}
            aria-hidden
          >
            target
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
          <span className="tabular-nums">
            <span className="font-semibold text-foreground">
              {hasData ? `${progressPct.toFixed(0)}%` : '—'}
            </span>{' '}
            of target
          </span>
          <span className="tabular-nums">
            {hasData ? `${result.current.toFixed(1)}% of ${result.denominator.toLocaleString()}` : '—'} ·
            target {result.t100.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-self-start sm:justify-self-end">
        <div className="text-right text-xs">
          <p className="text-muted-foreground">Per week</p>
          <p className="font-semibold tabular-nums text-foreground">
            {result.weeklyRunRate === null
              ? 'n/a'
              : result.weeklyRunRate > 0
                ? result.weeklyRunRate
                : '—'}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="text-muted-foreground">£ at stake</p>
          <p className="font-semibold tabular-nums text-foreground">
            {fmt(result.revenue, { currency: true })}
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
    </div>
  )
}
