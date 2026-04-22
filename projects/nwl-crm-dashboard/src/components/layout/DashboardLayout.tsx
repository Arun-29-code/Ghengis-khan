'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { CSVUploadButton } from '@/components/ui/CSVUploadButton'
import { OverviewTab } from '@/components/overview/OverviewTab'
import { GroupSplitEntry } from '@/components/overview/GroupSplitEntry'
import { useDashboardStore } from '@/hooks/useDashboardStore'
import { formatDate } from '@/lib/utils'
import type { CSVUpload, GroupSplit, ParseResult } from '@/lib/types'
import { Sidebar, type TabId } from './Sidebar'
import { TopBar } from './TopBar'

interface DashboardLayoutProps {
  practiceName: string
  practiceOds: string
  pcnName?: string
}

interface PendingUpload {
  data: NonNullable<ParseResult['data']>
  crmRegisterSize: number
}

export function DashboardLayout({
  practiceName,
  practiceOds,
  pcnName,
}: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingUpload | null>(null)
  const addUpload = useDashboardStore((s) => s.addUpload)

  // Zustand persist has skipHydration: true; rehydrate once on mount.
  useEffect(() => {
    useDashboardStore.persist.rehydrate()
    setHydrated(true)
  }, [])

  const currentUpload = useDashboardStore((s) => s.currentUpload)
  const lastUploadLabel =
    hydrated && currentUpload ? formatDate(currentUpload.uploadDate) : null
  const dateBadgeLabel = lastUploadLabel ? `Uploaded ${lastUploadLabel}` : undefined

  const finalizeUpload = useCallback(
    (data: NonNullable<ParseResult['data']>, split: GroupSplit) => {
      const upload: CSVUpload = {
        practiceCode: practiceOds,
        practiceName,
        uploadDate: new Date().toISOString(),
        weekNumber: data.weekNumber,
        populationCount: data.populationCount,
        lastRunTimestamp: data.lastRunTimestamp,
        kpiRows: data.kpiRows,
        rawRows: {},
        groupSplit: split,
      }
      addUpload(upload)
      setPending(null)
      setError(null)
    },
    [addUpload, practiceName, practiceOds],
  )

  const handleUpload = useCallback(
    (result: ParseResult) => {
      setError(null)
      if (!result.success || !result.data) {
        setError(result.error ?? 'Failed to parse CSV')
        return
      }
      const { groupSplit, kpiRows } = result.data
      const crmRegisterSize = kpiRows.CRM02?.denominator ?? 0

      // Derive Group 3 if missing but G1 and G2 are known (spec §7.5).
      let g3 = groupSplit.group3
      if (g3 === null && groupSplit.group1 !== null && groupSplit.group2 !== null) {
        g3 = Math.max(0, crmRegisterSize - groupSplit.group1 - groupSplit.group2)
      }

      if (
        groupSplit.group1 !== null &&
        groupSplit.group2 !== null &&
        g3 !== null
      ) {
        finalizeUpload(result.data, {
          group1: groupSplit.group1,
          group2: groupSplit.group2,
          group3: g3,
        })
      } else {
        setPending({ data: result.data, crmRegisterSize })
      }
    },
    [finalizeUpload],
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        practiceName={practiceName}
        pcnName={pcnName}
        lastUploadLabel={lastUploadLabel}
      />
      <div className="flex flex-1 flex-col">
        <TopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          dateBadgeLabel={dateBadgeLabel}
          trailingSlot={<CSVUploadButton onUpload={handleUpload} size="md" />}
        />
        <main className="flex-1 bg-background p-6">
          {error ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          {pending ? (
            <GroupSplitEntry
              initialSplit={pending.data.groupSplit}
              crmRegisterSize={pending.crmRegisterSize}
              onConfirm={(split) => finalizeUpload(pending.data, split)}
              onCancel={() => setPending(null)}
            />
          ) : activeTab === 'overview' ? (
            <OverviewTab onUpload={handleUpload} />
          ) : activeTab === 'kpis' ? (
            <TabPlaceholder
              title="KPI Performance"
              note="Per-KPI cards (gauges, horizontal bars) land here in Phase 7."
            />
          ) : activeTab === 'financials' ? (
            <TabPlaceholder
              title="Financials"
              note="Group tariff cards and revenue donut land here in Phase 8."
            />
          ) : (
            <TabPlaceholder
              title="PCN Practices"
              note="K&W West PCN practice grid lands here in Phase 9."
            />
          )}
        </main>
      </div>
    </div>
  )
}

function TabPlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </div>
  )
}
