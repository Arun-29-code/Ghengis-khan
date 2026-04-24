import { StatsCard } from '@/components/ui/StatsCard'
import { Badge } from '@/components/ui/Badge'
import { statusBadge } from '@/components/kpis/status'
import { fmt } from '@/lib/utils'
import type { KPIResult, RAGStatus } from '@/lib/types'

interface HeadlineCardsProps {
  totalRevenue: number
  securedRevenue: number
  onTargetRevenue: number
  atRiskRevenue: number
  kpiResults: KPIResult[]
}

export function HeadlineCards({
  totalRevenue,
  securedRevenue,
  onTargetRevenue,
  atRiskRevenue,
  kpiResults,
}: HeadlineCardsProps) {
  const ragCounts = kpiResults.reduce(
    (acc, k) => {
      acc[k.ragStatus]++
      return acc
    },
    { green: 0, amber: 0, red: 0 },
  )

  const pct = (n: number) => (totalRevenue > 0 ? (n / totalRevenue) * 100 : 0)

  // Aggregate RAG = the worst status across all KPIs. Uses the canonical label
  // set from components/kpis/status.ts so the "KPI Status" pill matches per-KPI
  // pills elsewhere on the dashboard.
  const worstRag: RAGStatus =
    ragCounts.red > 0 ? 'red' : ragCounts.amber > 0 ? 'amber' : 'green'
  const aggregateBadge = statusBadge(worstRag)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard
        label="Max Annual Revenue"
        value={fmt(totalRevenue, { currency: true })}
        sub="G1+G2+G3 × tariff"
        accentColor="gradient"
      />
      <StatsCard
        label="Secured"
        value={fmt(securedRevenue, { currency: true })}
        sub={`${pct(securedRevenue).toFixed(1)}% of total`}
        accentColor="green"
      />
      <StatsCard
        label="On Target"
        value={fmt(onTargetRevenue, { currency: true })}
        sub={`${pct(onTargetRevenue).toFixed(1)}% of total`}
        accentColor="blue"
      />
      <StatsCard
        label="At Risk"
        value={fmt(atRiskRevenue, { currency: true })}
        sub={`${pct(atRiskRevenue).toFixed(1)}% of total`}
        accentColor="red"
      />
      <StatsCard
        label="KPI Status"
        value={`${ragCounts.green}/${kpiResults.length}`}
        sub={`${ragCounts.amber} amber · ${ragCounts.red} red`}
        accentColor="gradient"
        badge={<Badge variant={aggregateBadge.variant}>{aggregateBadge.label}</Badge>}
      />
    </div>
  )
}
