'use client'

import { Upload, AlertTriangle } from 'lucide-react'
import { StatsCard } from '@/components/ui/StatsCard'
import { CSVUploadButton } from '@/components/ui/CSVUploadButton'
import { GroupTariffCards } from './GroupTariffCards'
import { RevenueDonutChart } from './RevenueDonutChart'
import { useDashboardStore } from '@/hooks/useDashboardStore'
import { fmt } from '@/lib/utils'
import type { ParseResult } from '@/lib/types'

interface FinancialsTabProps {
  onUpload: (result: ParseResult) => void
}

export function FinancialsTab({ onUpload }: FinancialsTabProps) {
  const yearEndUpload = useDashboardStore((s) => s.yearEndUpload)
  const todayUpload = useDashboardStore((s) => s.todayUpload)
  const kpiResults = useDashboardStore((s) => s.kpiResults)
  const totalRevenue = useDashboardStore((s) => s.totalRevenue)
  const securedRevenue = useDashboardStore((s) => s.securedRevenue)
  const onTargetRevenue = useDashboardStore((s) => s.onTargetRevenue)
  const atRiskRevenue = useDashboardStore((s) => s.atRiskRevenue)

  // Financials is driven by Group 1/2/3 counts which only exist in the year-end
  // report. Without it we can't compute the annual ceiling.
  if (!yearEndUpload) {
    const title = todayUpload
      ? 'Year-end report required for financials'
      : 'No reports loaded yet'
    const body = todayUpload
      ? 'Today’s report only contains CRM04–06. The annual revenue ceiling comes from Group 1/2/3 risk counts which live in the year-end report.'
      : 'Upload the year-end EMIS report to see the tariff breakdown and revenue pipeline.'

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          {todayUpload ? (
            <AlertTriangle className="mx-auto h-12 w-12 text-warning" aria-hidden />
          ) : (
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
          )}
          <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          <div className="mt-6 flex justify-center">
            <CSVUploadButton onUpload={onUpload} size="lg" />
          </div>
        </div>
      </div>
    )
  }

  const sortedByRevenue = [...kpiResults].sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Annual revenue ceiling"
          value={fmt(totalRevenue, { currency: true })}
          sub={`Week ${yearEndUpload.weekNumber} of 52`}
          accentColor="gradient"
        />
        <StatsCard
          label="Secured"
          value={fmt(securedRevenue, { currency: true })}
          sub="Full-pay thresholds already met"
          accentColor="green"
        />
        <StatsCard
          label="On Target"
          value={fmt(onTargetRevenue, { currency: true })}
          sub="On pace or half-pay"
          accentColor="blue"
        />
        <StatsCard
          label="At Risk"
          value={fmt(atRiskRevenue, { currency: true })}
          sub="Behind pace and no threshold yet"
          accentColor="red"
        />
      </div>

      <section>
        <header className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">Tariff split by risk group</h2>
          <p className="text-xs text-muted-foreground">
            Annual ceiling is the sum of per-patient tariffs across Groups 1, 2 and 3.
          </p>
        </header>
        <GroupTariffCards split={yearEndUpload.groupSplit} />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RevenueDonutChart
          securedRevenue={securedRevenue}
          onTargetRevenue={onTargetRevenue}
          atRiskRevenue={atRiskRevenue}
          totalRevenue={totalRevenue}
        />

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">KPI revenue allocation</h3>
            <p className="text-xs text-muted-foreground">
              Contract weight × annual ceiling
            </p>
          </div>
          <ul className="divide-y divide-border">
            {sortedByRevenue.map((r) => (
              <li
                key={r.code}
                className="flex items-center justify-between gap-4 px-5 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{r.code}</p>
                  <p className="truncate text-foreground">
                    {r.label}
                    {r.denominator === 0 ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        awaiting data
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums text-foreground">
                    {fmt(r.revenue, { currency: true })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.weight}% of contract
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
