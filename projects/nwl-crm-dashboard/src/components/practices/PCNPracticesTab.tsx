'use client'

import { PracticeCard } from './PracticeCard'
import { PCN_PRACTICES } from '@/lib/constants'
import { useDashboardStore } from '@/hooks/useDashboardStore'

interface PCNPracticesTabProps {
  currentOds: string
}

export function PCNPracticesTab({ currentOds }: PCNPracticesTabProps) {
  const currentUpload = useDashboardStore((s) => s.currentUpload)
  const totalRevenue = useDashboardStore((s) => s.totalRevenue)
  const securedRevenue = useDashboardStore((s) => s.securedRevenue)
  const atRiskRevenue = useDashboardStore((s) => s.atRiskRevenue)

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">K&W West PCN</h2>
        <p className="text-xs text-muted-foreground">
          {PCN_PRACTICES.length} member practices. Per-practice CSV uploads are Phase 2 —
          for now, only this practice shows live data.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PCN_PRACTICES.map((p) => {
          const isCurrent = p.ods === currentOds
          return (
            <PracticeCard
              key={`${p.name}-${p.ods ?? 'none'}`}
              practice={p}
              isCurrent={isCurrent}
              uploadDate={isCurrent ? currentUpload?.uploadDate : undefined}
              totalRevenue={isCurrent ? totalRevenue : undefined}
              securedRevenue={isCurrent ? securedRevenue : undefined}
              atRiskRevenue={isCurrent ? atRiskRevenue : undefined}
              weekNumber={isCurrent ? currentUpload?.weekNumber : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
