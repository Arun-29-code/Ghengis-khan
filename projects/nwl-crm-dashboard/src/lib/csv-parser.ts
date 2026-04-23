import Papa from 'papaparse'
import { differenceInDays, parseISO } from 'date-fns'
import {
  CONTRACT_START,
  CRM06_NUMERATOR_CODE,
  KPI_CONFIG,
} from './constants'
import type { ParseResult, ReportType } from './types'

/**
 * Group detection — anchored to START of the column so descriptive KPI rows
 * (e.g. "CRM09D | DEN | High or Moderate Risk") don't get misclassified.
 * EMIS currently uses "*RISK00A/B/C"; the word-based patterns are legacy
 * fallbacks in case the export format changes.
 */
const GROUP_PATTERNS = {
  group1: [/^\*?RISK00A\b/i, /^group\s*1\b/i, /^high\s*risk/i, /^\*?g1\b/i],
  group2: [/^\*?RISK00B\b/i, /^group\s*2\b/i, /^moderate\s*risk/i, /^\*?g2\b/i],
  group3: [/^\*?RISK00C\b/i, /^group\s*3\b/i, /^lower\s*risk/i, /^standard\s*risk/i, /^\*?g3\b/i],
}

const KPI_CODES = new Set(KPI_CONFIG.map((k) => k.code))

type CodeMapping = { kpi: string; isDenominator: boolean }

function extractCode(raw: string): string {
  return raw.trim().replace(/^\*+/, '').split('|')[0]!.trim()
}

function codeToKPI(code: string): CodeMapping | null {
  if (code === CRM06_NUMERATOR_CODE) return { kpi: 'CRM06', isDenominator: false }
  if (KPI_CODES.has(code)) return { kpi: code, isDenominator: false }
  if (code.endsWith('D')) {
    const base = code.slice(0, -1)
    if (KPI_CODES.has(base)) return { kpi: base, isDenominator: true }
  }
  return null
}

/** Sniff the report type from the first informative row of the CSV. */
function detectReportType(rows: string[][]): ReportType {
  for (const row of rows) {
    if (!row || row.length === 0) continue
    const combined = row.join(' ').toLowerCase()
    if (!combined.trim()) continue
    if (/run\s+(?:at\s+)?end\s+of\s+year/.test(combined) || /report\s*1\b/.test(combined)) {
      return 'year-end'
    }
    if (/run\s+today'?s?\s+date/.test(combined) || /report\s*2\b/.test(combined)) {
      return 'today'
    }
    // Only scan the first ~3 non-empty rows — stop before we hit KPI data.
    if (combined.includes('last run')) break
  }
  return 'unknown'
}

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

  const reportType = detectReportType(parsed.data.slice(0, 6))

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

    if (/^last\s*run/i.test(col0)) {
      lastRunTimestamp = col1
      continue
    }

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

    // Group rows — anchored patterns so KPI descriptions can't false-match.
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
      reportType,
    },
  }
}
