import { Badge } from '@/components/ui/Badge'
import { GaugeSVG } from './GaugeSVG'
import { cn, fmt } from '@/lib/utils'
import { statusBadge, RAG_COLOR } from './status'
import type { KPIResult } from '@/lib/types'

interface KPIWideCardProps {
  result: KPIResult
  className?: string
}

export function KPIWideCard({ result, className }: KPIWideCardProps) {
  const badge = statusBadge(result.ragStatus)
  const hasData = result.denominator > 0

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
            {result.code}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-foreground">
            {result.label}
          </h3>
          <p className="text-xs text-muted-foreground">
            {result.weight}% of contract ·{' '}
            <span className="font-semibold text-foreground">
              {fmt(result.revenue, { currency: true })}
            </span>{' '}
            at stake
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <div className="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-4">
          <GaugeSVG
            current={result.current}
            target={result.t100}
            color={RAG_COLOR[result.ragStatus]}
            size="lg"
          />
          <div>
            <p className="text-3xl font-extrabold tabular-nums text-foreground">
              {hasData ? `${result.current.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              target {result.t100.toFixed(1)}% · half-pay {result.t50.toFixed(1)}%
            </p>
            {result.isSmallRegister ? (
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                Small register · pace unreliable
              </p>
            ) : null}
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Stat label="Numerator" value={hasData ? result.numerator.toLocaleString() : '—'} />
          <Stat label="Denominator" value={hasData ? result.denominator.toLocaleString() : '—'} />
          <Stat
            label="Patients needed"
            value={hasData && result.patientsNeeded > 0 ? result.patientsNeeded.toLocaleString() : '—'}
          />
          <Stat
            label="Per week"
            value={
              result.weeklyRunRate === null
                ? 'n/a'
                : result.weeklyRunRate > 0
                  ? `${result.weeklyRunRate}`
                  : 'at target'
            }
          />
          <Stat
            label="Expected at pace"
            value={result.expectedAtPace === null ? 'n/a' : `${result.expectedAtPace.toFixed(1)}%`}
          />
          <Stat
            label="Δ week"
            value={
              result.delta === null
                ? '—'
                : `${result.delta >= 0 ? '+' : ''}${result.delta.toFixed(1)}pp`
            }
          />
        </dl>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}
