'use client'

import { Upload } from 'lucide-react'
import { CSVUploadButton } from '@/components/ui/CSVUploadButton'
import { UploadBanner } from '@/components/ui/UploadBanner'
import { HeadlineCards } from './HeadlineCards'
import { RevenuePipeline } from './RevenuePipeline'
import { PriorityTable } from './PriorityTable'
import { useDashboardStore } from '@/hooks/useDashboardStore'
import { formatDate } from '@/lib/utils'
import type { ParseResult } from '@/lib/types'

interface OverviewTabProps {
  onUpload: (result: ParseResult) => void
}

export function OverviewTab({ onUpload }: OverviewTabProps) {
  const currentUpload = useDashboardStore((s) => s.currentUpload)
  const kpiResults = useDashboardStore((s) => s.kpiResults)
  const totalRevenue = useDashboardStore((s) => s.totalRevenue)
  const securedRevenue = useDashboardStore((s) => s.securedRevenue)
  const onTargetRevenue = useDashboardStore((s) => s.onTargetRevenue)
  const atRiskRevenue = useDashboardStore((s) => s.atRiskRevenue)

  if (!currentUpload) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Upload your EMIS export to get started
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Export your Local Enhanced Services CSV from EMIS Web, then click the
            button below to process it. The dashboard will run locally in your
            browser — no data leaves your device.
          </p>
          <div className="mt-6 flex justify-center">
            <CSVUploadButton onUpload={onUpload} size="lg" />
          </div>
        </div>
      </div>
    )
  }

  const uploadDate = formatDate(currentUpload.uploadDate)
  const nKPIRows = Object.keys(currentUpload.kpiRows).length

  return (
    <div className="space-y-5">
      <UploadBanner
        accent="info"
        title={`Showing latest upload · ${uploadDate}`}
        right={<CSVUploadButton onUpload={onUpload} size="sm" label="Replace CSV" />}
      >
        {nKPIRows} KPI rows parsed · Population{' '}
        {currentUpload.populationCount.toLocaleString()} · Week{' '}
        {currentUpload.weekNumber} of 52
      </UploadBanner>

      <HeadlineCards
        totalRevenue={totalRevenue}
        securedRevenue={securedRevenue}
        onTargetRevenue={onTargetRevenue}
        atRiskRevenue={atRiskRevenue}
        kpiResults={kpiResults}
      />

      <RevenuePipeline
        totalRevenue={totalRevenue}
        securedRevenue={securedRevenue}
        onTargetRevenue={onTargetRevenue}
        atRiskRevenue={atRiskRevenue}
      />

      <PriorityTable results={kpiResults} />
    </div>
  )
}
