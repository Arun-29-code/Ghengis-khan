import { Badge } from '@/components/ui/Badge'
import { GaugeSVG } from './GaugeSVG'
import { cn, fmt } from '@/lib/utils'
import { statusBadge, RAG_COLOR } from './status'
import type { CRM08Breakdown, KPIResult, SubMeasure } from '@/lib/types'

interface CRM08CardProps {
  result: KPIResult
  breakdown: CRM08Breakdown | null
  className?: string
}

/**
 * CRM08 is one payment KPI (Lifestyle Improvement) that rolls up three
 * informational sub-measures: physical activity, BMI, and smoking cessation.
 * The headline gauge shows the combined % against G1+G2; the sub-measures
 * below are shown for context only and do not generate separate revenue.
 */
export function CRM08Card({ result, breakdown, className }: CRM08CardProps) {
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
            current={Math.min(100, (result.current / result.t100) * 100)}
            target={100}
            color={RAG_COLOR[result.ragStatus]}
            size="lg"
          />
          <div>
            <p className="text-3xl font-extrabold tabular-nums text-foreground">
              {hasData ? `${result.current.toFixed(2)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              target {result.t100.toFixed(1)}% · half-pay {result.t50.toFixed(1)}%
            </p>
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Stat
            label="Numerator (sum)"
            value={hasData ? result.numerator.toLocaleString() : '—'}
          />
          <Stat
            label="Denominator (G1+G2)"
            value={hasData ? result.denominator.toLocaleString() : '—'}
          />
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
                  ? String(result.weeklyRunRate)
                  : 'at target'
            }
          />
          <Stat
            label="Expected at pace"
            value={result.expectedAtPace === null ? 'n/a' : `${result.expectedAtPace.toFixed(2)}%`}
          />
          <Stat
            label="Δ week"
            value={
              result.delta === null
                ? '—'
                : `${result.delta >= 0 ? '+' : ''}${result.delta.toFixed(2)}pp`
            }
          />
        </dl>
      </div>

      {breakdown ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
            Sub-measures
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <SubRow label="Activity" data={breakdown.activity} />
            <SubRow label="BMI" data={breakdown.bmi} />
            <SubRow label="Smoking" data={breakdown.smoking} />
          </div>
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            Sum of sub-measures — may include patients who improved in multiple areas.
          </p>
        </div>
      ) : null}
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

function SubRow({ label, data }: { label: string; data: SubMeasure }) {
  const pct = data.denominator > 0 ? (data.numerator / data.denominator) * 100 : 0
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
          {label}
        </p>
        <p className="tabular-nums font-semibold text-foreground">
          {data.numerator.toLocaleString()} of {data.denominator.toLocaleString()}
        </p>
      </div>
      <p className="text-sm font-semibold tabular-nums text-foreground">
        {data.denominator > 0 ? `${pct.toFixed(2)}%` : '—'}
      </p>
    </div>
  )
}
