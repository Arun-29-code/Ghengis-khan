import { Badge } from '@/components/ui/Badge'
import { GaugeSVG } from './GaugeSVG'
import { cn, fmt } from '@/lib/utils'
import type { KPIResult, RAGStatus } from '@/lib/types'

interface KPISmallCardProps {
  result: KPIResult
  className?: string
}

const RAG_COLOR: Record<RAGStatus, string> = {
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  red:   'var(--color-destructive)',
}

const RAG_BADGE: Record<RAGStatus, { variant: 'success' | 'warning' | 'destructive'; label: string }> = {
  green: { variant: 'success',     label: 'On track' },
  amber: { variant: 'warning',     label: 'At risk'  },
  red:   { variant: 'destructive', label: 'Behind'   },
}

export function KPISmallCard({ result, className }: KPISmallCardProps) {
  const badge = RAG_BADGE[result.ragStatus]
  const hasData = result.denominator > 0

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
            {result.code}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {result.label}
          </h3>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <GaugeSVG
          current={result.current}
          target={result.t100}
          color={RAG_COLOR[result.ragStatus]}
          size="md"
        />
        <div className="min-w-0">
          <p className="text-2xl font-extrabold tabular-nums text-foreground">
            {hasData ? `${result.current.toFixed(1)}%` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            target {result.t100.toFixed(1)}%
          </p>
          {result.isSmallRegister ? (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
              Small register
            </p>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <Stat label="Patients needed" value={hasData && result.patientsNeeded > 0 ? result.patientsNeeded.toLocaleString() : '—'} />
        <Stat
          label="Per week"
          value={
            result.weeklyRunRate === null
              ? 'n/a'
              : result.weeklyRunRate > 0
                ? result.weeklyRunRate.toString()
                : '—'
          }
        />
        <Stat label="Δ week" value={result.delta === null ? '—' : `${result.delta >= 0 ? '+' : ''}${result.delta.toFixed(1)}pp`} />
        <Stat label="£ at stake" value={fmt(result.revenue, { currency: true })} />
      </dl>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}
