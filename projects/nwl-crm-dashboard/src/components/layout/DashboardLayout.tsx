'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { CSVUploadButton } from '@/components/ui/CSVUploadButton'
import { OverviewTab } from '@/components/overview/OverviewTab'
import { GroupSplitEntry } from '@/components/overview/GroupSplitEntry'
import { KPITab } from '@/components/kpis/KPITab'
import { FinancialsTab } from '@/components/financials/FinancialsTab'
import { PCNPracticesTab } from '@/components/practices/PCNPracticesTab'
import { GroupRegisterBanner } from '@/components/dashboard/GroupRegisterBanner'
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

  useEffect(() => {
    const unsub = useDashboardStore.persist.onFinishHydration(() => setHydrated(true))
    void useDashboardStore.persist.rehydrate()
    return unsub
  }, [])

  const yearEndUpload = useDashboardStore((s) => s.yearEndUpload)
  const todayUpload = useDashboardStore((s) => s.todayUpload)

  const yearEndDate =
    hydrated && yearEndUpload ? formatDate(yearEndUpload.uploadDate) : null
  const todayDate =
    hydrated && todayUpload ? formatDate(todayUpload.uploadDate) : null

  // Newer of the two for the topbar date badge.
  const latestUploadIso =
    hydrated
      ? [yearEndUpload?.uploadDate, todayUpload?.uploadDate]
          .filter((x): x is string => Boolean(x))
          .sort()
          .at(-1)
      : undefined
  const dateBadgeLabel = latestUploadIso ? `Uploaded ${formatDate(latestUploadIso)}` : undefined

  const finalizeUpload = useCallback(
    (data: NonNullable<ParseResult['data']>, split: GroupSplit) => {
      // If Group 1/2 were just entered by hand via the GroupSplitEntry modal,
      // we need to rebuild the aggregated CRM08 and overridden CRM09 denominators
      // now that G1+G2 is finally known. The parser can't do it upfront if the
      // groups weren't in the CSV.
      const kpiRows = { ...data.kpiRows }
      const g12 = split.group1 + split.group2
      if (data.crm08Breakdown && g12 > 0) {
        const sumNum =
          data.crm08Breakdown.activity.numerator +
          data.crm08Breakdown.bmi.numerator +
          data.crm08Breakdown.smoking.numerator
        kpiRows['CRM08'] = { numerator: sumNum, denominator: g12 }
      }
      if (kpiRows['CRM09'] && g12 > 0) {
        kpiRows['CRM09'] = {
          numerator: kpiRows['CRM09'].numerator,
          denominator: g12,
        }
      }

      const upload: CSVUpload = {
        practiceCode: practiceOds,
        practiceName,
        uploadDate: new Date().toISOString(),
        weekNumber: data.weekNumber,
        populationCount: data.populationCount,
        lastRunTimestamp: data.lastRunTimestamp,
        kpiRows,
        crm08Breakdown: data.crm08Breakdown,
        rawRows: {},
        groupSplit: split,
        reportType: data.reportType,
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
      const data = result.data

      // Today's report has no Group 1/2/3 rows by design — short-circuit the
      // groupSplit check. Store will merge with the yearEnd slot's groupSplit.
      if (data.reportType === 'today') {
        finalizeUpload(data, { group1: 0, group2: 0, group3: 0 })
        return
      }

      // Year-end path: derive Group 3 if missing, else prompt for G1/G2.
      const { groupSplit, kpiRows } = data
      const crmRegisterSize = kpiRows.CRM02?.denominator ?? 0
      let g3 = groupSplit.group3
      if (g3 === null && groupSplit.group1 !== null && groupSplit.group2 !== null) {
        g3 = Math.max(0, crmRegisterSize - groupSplit.group1 - groupSplit.group2)
      }

      if (
        groupSplit.group1 !== null &&
        groupSplit.group2 !== null &&
        g3 !== null
      ) {
        finalizeUpload(data, {
          group1: groupSplit.group1,
          group2: groupSplit.group2,
          group3: g3,
        })
      } else {
        setPending({ data, crmRegisterSize })
      }
    },
    [finalizeUpload],
  )

  // Top-level tab changes (TopBar tabs + Sidebar main nav) should always land
  // the user at the top of the new tab's content. The sub-nav "jump to section"
  // handler below bypasses this — it targets a specific section, not the top.
  const handleTabChange = useCallback((id: TabId) => {
    setActiveTab(id)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [])

  const handleNavigateToSection = useCallback((sectionId: string) => {
    setActiveTab('kpis')
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('animate-nav-flash')
      window.setTimeout(() => el.classList.remove('animate-nav-flash'), 1200)
    })
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNavigateToSection={handleNavigateToSection}
        practiceName={practiceName}
        pcnName={pcnName}
        yearEndDate={yearEndDate}
        todayDate={todayDate}
      />
      <div className="flex flex-1 flex-col">
        <TopBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
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
          ) : (
            <>
              <GroupRegisterBanner
                group1={yearEndUpload?.groupSplit.group1 ?? null}
                group2={yearEndUpload?.groupSplit.group2 ?? null}
                group3={yearEndUpload?.groupSplit.group3 ?? null}
                crmRegister={yearEndUpload?.kpiRows['CRM02']?.denominator ?? null}
              />
              {renderTab(activeTab, handleUpload, practiceOds)}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function renderTab(
  activeTab: TabId,
  handleUpload: (result: ParseResult) => void,
  practiceOds: string,
) {
  if (activeTab === 'overview') return <OverviewTab onUpload={handleUpload} />
  if (activeTab === 'kpis') return <KPITab onUpload={handleUpload} />
  if (activeTab === 'financials') return <FinancialsTab onUpload={handleUpload} />
  return <PCNPracticesTab currentOds={practiceOds} />
}
