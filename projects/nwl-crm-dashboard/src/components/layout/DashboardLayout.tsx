'use client'

import { useEffect, useState } from 'react'
import { useDashboardStore } from '@/hooks/useDashboardStore'
import { formatDate } from '@/lib/utils'
import { Sidebar, type TabId } from './Sidebar'
import { TopBar } from './TopBar'

interface DashboardLayoutProps {
  practiceName: string
  pcnName?: string
}

export function DashboardLayout({ practiceName, pcnName }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [hydrated, setHydrated] = useState(false)

  // Zustand persist has skipHydration: true; rehydrate once on mount.
  useEffect(() => {
    useDashboardStore.persist.rehydrate()
    setHydrated(true)
  }, [])

  const currentUpload = useDashboardStore((s) => s.currentUpload)
  const lastUploadLabel =
    hydrated && currentUpload ? formatDate(currentUpload.uploadDate) : null
  const dateBadgeLabel = lastUploadLabel ? `Uploaded ${lastUploadLabel}` : undefined

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
        />
        <main className="flex-1 bg-background p-6">
          {activeTab === 'overview' ? (
            <TabPlaceholder title="Overview" note="Headline cards, revenue pipeline and priority table land here in Phase 6." />
          ) : activeTab === 'kpis' ? (
            <TabPlaceholder title="KPI Performance" note="Per-KPI cards (gauges, horizontal bars) land here in Phase 7." />
          ) : activeTab === 'financials' ? (
            <TabPlaceholder title="Financials" note="Group tariff cards and revenue donut land here in Phase 8." />
          ) : (
            <TabPlaceholder title="PCN Practices" note="K&W West PCN practice grid lands here in Phase 9." />
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
