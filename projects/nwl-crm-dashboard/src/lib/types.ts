export type KPIType = 'C' | 'S' // Cumulative vs Static
export type RAGStatus = 'green' | 'amber' | 'red'
export type PaymentBand = 'full' | 'half' | 'none'
export type RevenueBucket = 'secured' | 'onTarget' | 'atRisk'

export interface KPIConfig {
  code: string // e.g. 'CRM01A'
  label: string // e.g. 'AF Coding'
  short: string // e.g. 'AF'
  t100: number // 100% payment threshold (%)
  t50: number // 50% payment threshold (%)
  weight: number // % of total contract value (weights sum to 100)
  type: KPIType
  group: string // e.g. '01', '02', '0306', '07', '0809'
}

export interface KPIDataRow {
  numerator: number
  denominator: number
  prevNumerator: number | null // from previous week's upload
  prevDenominator: number | null
}

export interface KPIResult extends KPIConfig, KPIDataRow {
  current: number // num/den * 100
  revenue: number // £ allocated to this KPI (weight% of totalRev)
  paymentBand: PaymentBand
  ragStatus: RAGStatus
  revenueBucket: RevenueBucket
  patientsNeeded: number // to reach 100% threshold
  weeklyRunRate: number | null // patients/week needed (cumulative KPIs only)
  expectedAtPace: number | null // expected% at this point in year (cumulative)
  delta: number | null // pp change vs previous week
  isSmallRegister: boolean // den < 20 — pace% unreliable
}

export interface GroupSplit {
  group1: number // High risk patients (£107.08/yr)
  group2: number // Moderate risk patients (£53.13/yr)
  group3: number // Lower risk patients (£24.09/yr) — derived or uploaded
}

export interface CSVUpload {
  practiceCode: string
  practiceName: string
  uploadDate: string // ISO 8601
  weekNumber: number // 1–52
  populationCount: number
  rawRows: Record<string, number> // code → count (all parsed rows)
  kpiRows: Record<string, { numerator: number; denominator: number }>
  groupSplit: GroupSplit
  lastRunTimestamp: string
}

export interface DashboardState {
  currentUpload: CSVUpload | null
  previousUpload: CSVUpload | null // for week-on-week delta
  uploadHistory: CSVUpload[] // all uploads, newest first
  kpiResults: KPIResult[]
  totalRevenue: number
  securedRevenue: number
  onTargetRevenue: number
  atRiskRevenue: number
  groupSplitOverride: GroupSplit | null // manual override if not in CSV
}

export interface ParseResult {
  success: boolean
  error?: string
  data?: {
    lastRunTimestamp: string
    populationCount: number
    kpiRows: Record<string, { numerator: number; denominator: number }>
    groupSplit: {
      group1: number | null
      group2: number | null
      group3: number | null
    }
    weekNumber: number
  }
}

export interface PCNPractice {
  name: string
  ods: string | null
}
