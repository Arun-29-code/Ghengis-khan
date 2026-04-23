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
  const yearEndUpload = useDashboardStore((s) => s.yearEndUpload)
  const todayUpload = useDashboardStore((s) => s.todayUpload)
  const kpiResults = useDashboardStore((s) => s.kpiResults)
  const totalRevenue = useDashboardStore((s) => s.totalRevenue)
  const securedRevenue = useDashboardStore((s) => s.securedRevenue)
  const onTargetRevenue = useDashboardStore((s) => s.onTargetRevenue)
  const atRiskRevenue = useDashboardStore((s) => s.atRiskRevenue)

  if (!yearEndUpload && !todayUpload) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Upload your EMIS exports to get started
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This dashboard needs two CSVs: the year-end report (CRM01–03, 07, 08, 09
            + risk groups) and today&apos;s report (CRM04, 05, 06). The app detects
            which is which from the file header — just drop them in, either order.
          </p>
          <div className="mt-6 flex justify-center">
            <CSVUploadButton onUpload={onUpload} size="lg" />
          </div>
        </div>
      </div>
    )
  }

  // Metadata comes from year-end (true list size) if present, else from today.
  const metadataSource = yearEndUpload ?? todayUpload
  const nKPIRows =
    Object.keys(yearEndUpload?.kpiRows ?? {}).length +
    Object.keys(todayUpload?.kpiRows ?? {}).length

  const banner = renderUploadStatusBanner({
    yearEndDate: yearEndUpload ? formatDate(yearEndUpload.uploadDate) : null,
    todayDate: todayUpload ? formatDate(todayUpload.uploadDate) : null,
    nKPIRows,
    populationCount: yearEndUpload?.populationCount ?? metadataSource?.populationCount ?? 0,
    weekNumber: metadataSource?.weekNumber ?? 0,
    onUpload,
  })

  return (
    <div className="space-y-5">
      {banner}

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

      <PriorityTable results={kpiResults.filter((r) => r.denominator > 0)} />
    </div>
  )
}

interface BannerArgs {
  yearEndDate: string | null
  todayDate: string | null
  nKPIRows: number
  populationCount: number
  weekNumber: number
  onUpload: (result: ParseResult) => void
}

function renderUploadStatusBanner({
  yearEndDate,
  todayDate,
  nKPIRows,
  populationCount,
  weekNumber,
  onUpload,
}: BannerArgs) {
  const both = yearEndDate && todayDate
  const accent = both ? 'info' : 'warning'
  const title = both
    ? `Both reports loaded · Year-end ${yearEndDate} · Today ${todayDate}`
    : yearEndDate
      ? 'Year-end report loaded — today’s report missing'
      : 'Today’s report loaded — year-end report missing'

  const detail = both
    ? `${nKPIRows} KPI rows parsed · List size ${populationCount.toLocaleString()} · Week ${weekNumber} of 52`
    : yearEndDate
      ? 'CRM04–06 are awaiting today’s report. Upload it to complete the dashboard.'
      : 'Risk-group counts, revenue totals and most KPIs need the year-end report.'

  return (
    <UploadBanner
      accent={accent}
      title={title}
      right={
        <CSVUploadButton
          onUpload={onUpload}
          size="sm"
          label={both ? 'Replace a report' : 'Upload the other'}
        />
      }
    >
      {detail}
    </UploadBanner>
  )
}
