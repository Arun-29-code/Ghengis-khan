'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { CSVUploadButton } from '@/components/ui/CSVUploadButton'
import { OverviewTab } from '@/components/overview/OverviewTab'
import { GroupSplitEntry } from '@/components/overview/GroupSplitEntry'
import { KPITab } from '@/components/kpis/KPITab'
import { FinancialsTab } from '@/components/financials/FinancialsTab'
import { PCNPracticesTab } from '@/components/practices/PCNPracticesTab'
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

  // Zustand persist has skipHydration: true. Subscribe to onFinishHydration
  // (so we flip hydrated from a callback, not synchronously in the effect body)
  // and then trigger the rehydrate itself.
  useEffect(() => {
    const unsub = useDashboardStore.persist.onFinishHydration(() => setHydrated(true))
    void useDashboardStore.persist.rehydrate()
    return unsub
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

  const handleNavigateToSection = useCallback(
    (sectionId: string) => {
      // Tab switch is a no-op if already on kpis. scrollIntoView happens after
      // the next paint so the section has actually rendered.
      setActiveTab('kpis')
      requestAnimationFrame(() => {
        const el = document.getElementById(sectionId)
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.classList.add('animate-nav-flash')
        window.setTimeout(() => el.classList.remove('animate-nav-flash'), 1200)
      })
    },
    [],
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNavigateToSection={handleNavigateToSection}
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
            <KPITab onUpload={handleUpload} />
          ) : activeTab === 'financials' ? (
            <FinancialsTab onUpload={handleUpload} />
          ) : (
            <PCNPracticesTab currentOds={practiceOds} />
          )}
        </main>
      </div>
    </div>
  )
}

