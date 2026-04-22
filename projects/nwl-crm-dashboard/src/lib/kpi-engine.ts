import { CONTRACT_WEEKS, KPI_CONFIG, TARIFFS } from './constants'
import type {
  CSVUpload,
  GroupSplit,
  KPIResult,
  PaymentBand,
  RAGStatus,
  RevenueBucket,
} from './types'

export function calculateTotalRevenue(groups: GroupSplit): number {
  return (
    groups.group1 * TARIFFS.group1 +
    groups.group2 * TARIFFS.group2 +
    groups.group3 * TARIFFS.group3
  )
}

function computePaymentBand(current: number, t100: number, t50: number): PaymentBand {
  if (current >= t100) return 'full'
  if (current >= t50) return 'half'
  return 'none'
}

interface RAGResult {
  rag: RAGStatus
  expectedAtPace: number | null
  isSmallRegister: boolean
}

function computeRAG(args: {
  current: number
  t100: number
  t50: number
  type: 'C' | 'S'
  weekNumber: number
  denominator: number
  numerator: number
}): RAGResult {
  const { current, t100, t50, type, weekNumber, denominator, numerator } = args

  if (type === 'S') {
    // Static KPIs: threshold-based
    return {
      rag: current >= t100 ? 'green' : current >= t50 ? 'amber' : 'red',
      expectedAtPace: null,
      isSmallRegister: false,
    }
  }

  // Cumulative KPIs: pace-based (with small-register + rounding guards)
  const expectedAtPace = t100 * (weekNumber / CONTRACT_WEEKS)
  const pace = expectedAtPace > 0 ? current / expectedAtPace : 0
  const expectedPatients = (expectedAtPace / 100) * denominator
  const gapPatients = expectedPatients - numerator
  const nearlyThere = gapPatients < 1
  let rag: RAGStatus =
    pace >= 0.9 || nearlyThere ? 'green' : pace >= 0.5 ? 'amber' : 'red'

  // Hybrid guard: a cumulative KPI can't be green if current% is still below
  // the half-pay threshold. Pace may be on track, but payment-wise we are not
  // past any payment bar yet — surface that with amber.
  if (rag === 'green' && current < t50) rag = 'amber'

  return {
    rag,
    expectedAtPace,
    isSmallRegister: denominator < 20,
  }
}

function computeRevenueBucket(
  paymentBand: PaymentBand,
  rag: RAGStatus,
): RevenueBucket {
  if (paymentBand === 'full') return 'secured'
  if (rag === 'green' || paymentBand === 'half') return 'onTarget'
  return 'atRisk'
}

export interface ComputeResult {
  results: KPIResult[]
  totalRev: number
  securedRev: number
  onTargetRev: number
  atRiskRev: number
}

export function computeKPIResults(
  currentUpload: CSVUpload,
  previousUpload: CSVUpload | null,
  effectiveSplit: GroupSplit,
): ComputeResult {
  const totalRev = calculateTotalRevenue(effectiveSplit)
  const weekNumber = currentUpload.weekNumber

  const results: KPIResult[] = KPI_CONFIG.map((config) => {
    const dataRow = currentUpload.kpiRows[config.code] ?? { numerator: 0, denominator: 0 }
    const prevDataRow = previousUpload?.kpiRows?.[config.code] ?? null
    const { numerator, denominator } = dataRow
    const current = denominator > 0 ? (numerator / denominator) * 100 : 0

    const paymentBand = computePaymentBand(current, config.t100, config.t50)
    const { rag, expectedAtPace, isSmallRegister } = computeRAG({
      current,
      t100: config.t100,
      t50: config.t50,
      type: config.type,
      weekNumber,
      denominator,
      numerator,
    })
    const revenueBucket = computeRevenueBucket(paymentBand, rag)

    const patientsNeeded = Math.max(
      0,
      Math.ceil((denominator * config.t100) / 100) - numerator,
    )
    const weeksRemaining = CONTRACT_WEEKS - weekNumber
    const weeklyRunRate =
      config.type === 'C'
        ? patientsNeeded > 0 && weeksRemaining > 0
          ? Math.ceil(patientsNeeded / weeksRemaining)
          : 0
        : null

    let delta: number | null = null
    if (prevDataRow && prevDataRow.denominator > 0) {
      const prevPct = (prevDataRow.numerator / prevDataRow.denominator) * 100
      delta = current - prevPct
    }

    const revenue = totalRev * (config.weight / 100)

    return {
      ...config,
      numerator,
      denominator,
      prevNumerator: prevDataRow?.numerator ?? null,
      prevDenominator: prevDataRow?.denominator ?? null,
      current,
      revenue,
      paymentBand,
      ragStatus: rag,
      revenueBucket,
      patientsNeeded,
      weeklyRunRate,
      expectedAtPace,
      delta,
      isSmallRegister,
    }
  })

  let securedRev = 0
  let onTargetRev = 0
  let atRiskRev = 0
  for (const r of results) {
    if (r.revenueBucket === 'secured') securedRev += r.revenue
    else if (r.revenueBucket === 'onTarget') onTargetRev += r.revenue
    else atRiskRev += r.revenue
  }

  return { results, totalRev, securedRev, onTargetRev, atRiskRev }
}
