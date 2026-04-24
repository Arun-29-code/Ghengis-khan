import { fmt } from '@/lib/utils'
import { REVENUE_COLORS } from '@/lib/constants'

interface RevenuePipelineProps {
  totalRevenue: number
  securedRevenue: number
  onTargetRevenue: number
  atRiskRevenue: number
}

export function RevenuePipeline({
  totalRevenue,
  securedRevenue,
  onTargetRevenue,
  atRiskRevenue,
}: RevenuePipelineProps) {
  const denom = totalRevenue > 0 ? totalRevenue : 1
  const segments = [
    { key: 'secured',  label: 'Secured',      value: securedRevenue,  color: REVENUE_COLORS.secured  },
    { key: 'onTarget', label: 'On Target',    value: onTargetRevenue, color: REVENUE_COLORS.onTarget },
    { key: 'atRisk',   label: 'Needs Action', value: atRiskRevenue,   color: REVENUE_COLORS.atRisk   },
  ] as const

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Revenue pipeline</h3>
          <p className="text-xs text-muted-foreground">
            Contract value split by current status
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {fmt(totalRevenue, { currency: true })}
        </span>
      </div>

      <div
        className="flex h-4 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label="Revenue pipeline split bar"
      >
        {segments.map((s) => {
          const width = (s.value / denom) * 100
          if (width <= 0) return null
          return (
            <div
              key={s.key}
              style={{ width: `${width}%`, backgroundColor: s.color }}
              title={`${s.label}: ${fmt(s.value, { currency: true })}`}
            />
          )
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <div>
              <p className="font-medium text-foreground">{s.label}</p>
              <p className="text-muted-foreground">
                {fmt(s.value, { currency: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
