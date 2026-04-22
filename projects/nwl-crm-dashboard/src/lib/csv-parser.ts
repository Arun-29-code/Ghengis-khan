import Papa from 'papaparse'
import { differenceInDays, parseISO } from 'date-fns'
import {
  CONTRACT_START,
  CRM06_NUMERATOR_CODE,
  KPI_CONFIG,
} from './constants'
import type { ParseResult } from './types'

const GROUP_PATTERNS = {
  group1: [/group\s*1/i, /high\s*risk/i, /\bg1\b/i],
  group2: [/group\s*2/i, /moderate\s*risk/i, /\bg2\b/i],
  group3: [/group\s*3/i, /lower\s*risk/i, /standard\s*risk/i, /\bg3\b/i],
}

// Set of known KPI numerator codes (CRM01A…CRM09).
const KPI_CODES = new Set(KPI_CONFIG.map((k) => k.code))

type CodeMapping = { kpi: string; isDenominator: boolean }

/** Strip leading asterisks and take the segment before the first pipe. */
function extractCode(raw: string): string {
  return raw.trim().replace(/^\*+/, '').split('|')[0]!.trim()
}

/**
 * Map a CSV code to a KPI code + role. Handles:
 *   - CRM06N → CRM06 numerator
 *   - CRM01AD → CRM01A denominator (strip trailing D)
 *   - CRM02D  → CRM02 denominator
 *   - CRM08AD → CRM08A denominator
 *   - plain numerator codes (CRM01A, CRM02, etc.)
 */
function codeToKPI(code: string): CodeMapping | null {
  if (code === CRM06_NUMERATOR_CODE) return { kpi: 'CRM06', isDenominator: false }
  if (KPI_CODES.has(code)) return { kpi: code, isDenominator: false }
  if (code.endsWith('D')) {
    const base = code.slice(0, -1)
    if (KPI_CODES.has(base)) return { kpi: base, isDenominator: true }
  }
  return null
}

/**
 * weekNumber = ceil(days since contract start / 7), minimum 1.
 * Integer value — fractional weeks are derived separately where needed.
 */
export function calculateWeekNumber(uploadDateISO: string): number {
  const days = differenceInDays(parseISO(uploadDateISO), parseISO(CONTRACT_START))
  return Math.max(1, Math.ceil(days / 7))
}

export function parseEMISCSV(csvText: string): ParseResult {
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true })

  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.find((e) => e.type === 'Delimiter' || e.type === 'Quotes')
    if (fatal) return { success: false, error: `CSV parse error: ${fatal.message}` }
  }

  const kpiRows: Record<string, { numerator: number; denominator: number }> = {}
  let lastRunTimestamp = ''
  let populationCount = 0
  const groupSplit: { group1: number | null; group2: number | null; group3: number | null } = {
    group1: null,
    group2: null,
    group3: null,
  }

  let awaitingPopulationValues = false

  for (const row of parsed.data) {
    if (!Array.isArray(row) || row.length === 0) continue
    const col0 = (row[0] ?? '').trim()
    const col1 = (row[1] ?? '').trim()
    if (!col0 && !col1) continue

    // "Last Run:,17/04/2026 17:03,..."
    if (/^last\s*run/i.test(col0)) {
      lastRunTimestamp = col1
      continue
    }

    // Two-row population pattern:
    //   "Population Count,Males,Females,"
    //   "15986,8586,7400,"
    if (/^population\s*count/i.test(col0)) {
      awaitingPopulationValues = true
      continue
    }
    if (awaitingPopulationValues) {
      const n = Number(col0.replace(/,/g, ''))
      if (Number.isFinite(n)) populationCount = n
      awaitingPopulationValues = false
      continue
    }

    // Group rows — tolerant of several label shapes.
    let matchedGroup = false
    for (const [key, patterns] of Object.entries(GROUP_PATTERNS)) {
      if (patterns.some((p) => p.test(col0))) {
        const n = Number(col1.replace(/,/g, ''))
        if (Number.isFinite(n)) {
          (groupSplit as Record<string, number | null>)[key] = n
        }
        matchedGroup = true
        break
      }
    }
    if (matchedGroup) continue

    // KPI rows: "CRM…" or "*CRM…"
    if (/^\*?\s*CRM\d/i.test(col0)) {
      const code = extractCode(col0)
      if (!code) continue
      const mapping = codeToKPI(code)
      if (!mapping) continue
      const n = Number(col1.replace(/,/g, ''))
      if (!Number.isFinite(n)) continue
      const existing = kpiRows[mapping.kpi] ?? { numerator: 0, denominator: 0 }
      if (mapping.isDenominator) existing.denominator = n
      else existing.numerator = n
      kpiRows[mapping.kpi] = existing
    }
  }

  const weekNumber = calculateWeekNumber(new Date().toISOString())

  return {
    success: true,
    data: {
      lastRunTimestamp,
      populationCount,
      kpiRows,
      groupSplit,
      weekNumber,
    },
  }
}
