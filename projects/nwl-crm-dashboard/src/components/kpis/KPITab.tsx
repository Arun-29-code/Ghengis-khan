'use client'

import { Upload } from 'lucide-react'
import { KPISection } from './KPISection'
import { KPISmallCard } from './KPISmallCard'
import { KPIWideCard } from './KPIWideCard'
import { KPIHBarRow } from './KPIHBarRow'
import { CSVUploadButton } from '@/components/ui/CSVUploadButton'
import { useDashboardStore } from '@/hooks/useDashboardStore'
import type { KPIResult, ParseResult, RAGStatus } from '@/lib/types'

interface KPITabProps {
  onUpload: (result: ParseResult) => void
}

// Section IDs must match the sidebar sub-nav targets (spec §13 scroll anchors).
export const KPI_SECTION_IDS = {
  detection:    'section-detection',
  careProcess:  'section-care-processes',
  outcomes:     'section-outcomes',
  carePlan:     'section-care-plan',
  conversations:'section-conversations',
} as const

const RAG_ORDER: Record<RAGStatus, number> = { red: 0, amber: 1, green: 2 }

/** The worst RAG among a set of KPIs (for section-level badge). */
function worstRAG(rs: KPIResult[]): RAGStatus | undefined {
  if (rs.length === 0) return undefined
  return rs.reduce<RAGStatus>(
    (worst, r) => (RAG_ORDER[r.ragStatus] < RAG_ORDER[worst] ? r.ragStatus : worst),
    'green',
  )
}

function pickByCodes(results: KPIResult[], codes: string[]): KPIResult[] {
  const byCode = new Map(results.map((r) => [r.code, r]))
  return codes.map((c) => byCode.get(c)).filter(Boolean) as KPIResult[]
}

export function KPITab({ onUpload }: KPITabProps) {
  const results = useDashboardStore((s) => s.kpiResults)
  const yearEndUpload = useDashboardStore((s) => s.yearEndUpload)
  const todayUpload = useDashboardStore((s) => s.todayUpload)

  if (!yearEndUpload && !todayUpload) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            No KPI data yet
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload an EMIS CSV on the Overview tab to populate per-KPI cards.
          </p>
          <div className="mt-6 flex justify-center">
            <CSVUploadButton onUpload={onUpload} size="lg" />
          </div>
        </div>
      </div>
    )
  }

  const detection    = pickByCodes(results, ['CRM01A', 'CRM01B', 'CRM01C', 'CRM01D', 'CRM01E'])
  const careProcess  = pickByCodes(results, ['CRM02'])
  const outcomes     = pickByCodes(results, ['CRM03', 'CRM04', 'CRM05', 'CRM06'])
  const carePlan     = pickByCodes(results, ['CRM07'])
  const conversations = pickByCodes(results, ['CRM08A', 'CRM08B', 'CRM08C', 'CRM09'])

  return (
    <div className="space-y-6">
      <KPISection
        id={KPI_SECTION_IDS.detection}
        title="Detection — CRM01"
        subtitle="Disease register coding across AF, CKD, DM, HTN, NDH"
        tariffLabel="20% of contract"
        rag={worstRAG(detection)}
      >
        <div className="space-y-3">
          {detection.map((r) => (
            <KPIHBarRow key={r.code} result={r} />
          ))}
        </div>
      </KPISection>

      <KPISection
        id={KPI_SECTION_IDS.careProcess}
        title="Care Processes — CRM02"
        subtitle="Core clinical processes for patients on the CRM register"
        tariffLabel="20% of contract"
        rag={worstRAG(careProcess)}
      >
        <div className="grid grid-cols-1 gap-3">
          {careProcess.map((r) => (
            <KPIWideCard key={r.code} result={r} />
          ))}
        </div>
      </KPISection>

      <KPISection
        id={KPI_SECTION_IDS.outcomes}
        title="Outcomes — CRM03 to CRM06"
        subtitle="Clinical outcome measures (BP, statins, ACEI/ARB, SGLT-2)"
        tariffLabel="20% of contract"
        rag={worstRAG(outcomes)}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map((r) => (
            <KPISmallCard key={r.code} result={r} />
          ))}
        </div>
      </KPISection>

      <KPISection
        id={KPI_SECTION_IDS.carePlan}
        title="Holistic Care Plan — CRM07"
        subtitle="Personalised care plans co-produced with high and moderate risk patients"
        tariffLabel="30% of contract"
        rag={worstRAG(carePlan)}
      >
        <div className="grid grid-cols-1 gap-3">
          {carePlan.map((r) => (
            <KPIWideCard key={r.code} result={r} />
          ))}
        </div>
      </KPISection>

      <KPISection
        id={KPI_SECTION_IDS.conversations}
        title="Conversations & Habits — CRM08 / CRM09"
        subtitle="Physical activity, BMI, smoking cessation, and patient-reported confidence"
        tariffLabel="10% of contract"
        rag={worstRAG(conversations)}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {conversations.map((r) => (
            <KPISmallCard key={r.code} result={r} />
          ))}
        </div>
      </KPISection>
    </div>
  )
}
