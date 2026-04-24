import { TARIFFS } from '@/lib/constants'
import { fmt } from '@/lib/utils'
import type { GroupSplit } from '@/lib/types'

interface GroupTariffCardsProps {
  split: GroupSplit
}

const GROUP_META = [
  {
    key: 'group1' as const,
    label: 'Group 1 · High risk',
    tariff: TARIFFS.group1,
    accent: 'bg-destructive',
    description: 'Highest-risk patients, full tariff',
  },
  {
    key: 'group2' as const,
    label: 'Group 2 · Moderate risk',
    tariff: TARIFFS.group2,
    accent: 'bg-warning',
    description: 'Moderate risk, mid tariff',
  },
  {
    key: 'group3' as const,
    label: 'Group 3 · Lower risk',
    tariff: TARIFFS.group3,
    accent: 'bg-primary',
    description: 'Lower risk, base tariff',
  },
]

export function GroupTariffCards({ split }: GroupTariffCardsProps) {
  const rows = GROUP_META.map((g) => {
    const count = split[g.key] ?? 0
    const subtotal = count * g.tariff
    return { ...g, count, subtotal }
  })
  const total = rows.reduce((s, r) => s + r.subtotal, 0)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {rows.map((r) => (
        <div
          key={r.key}
          className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${r.accent}`} />
          <p className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
            {r.label}
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-foreground">
            {r.count.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            patients · £{r.tariff.toFixed(2)}/yr each
          </p>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Contribution
            </p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {fmt(r.subtotal, { currency: true })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {total > 0 ? ((r.subtotal / total) * 100).toFixed(1) : '0.0'}% of total
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
