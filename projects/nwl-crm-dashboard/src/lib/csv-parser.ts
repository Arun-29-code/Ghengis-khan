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

/**
 * Codes that appear in the CSV but are *not* standalone payment KPIs. CRM08
 * sub-measures (A/B/C) are parsed for the informational breakdown, then
 * aggregated into the single CRM08 payment KPI after the main parse loop.
 */
const SUB_MEASURE_CODES = new Set(['CRM08A', 'CRM08B', 'CRM08C'])

type CodeMapping = { kpi: string; isDenominator: boolean }

function extractCode(raw: string): string {
  return raw.trim().replace(/^\*+/, '').split('|')[0]!.trim()
}

function codeToKPI(code: string): CodeMapping | null {
  if (code === CRM06_NUMERATOR_CODE) return { kpi: 'CRM06', isDenominator: false }
  if (KPI_CODES.has(code)) return { kpi: code, isDenominator: false }
  if (SUB_MEASURE_CODES.has(code)) return { kpi: code, isDenominator: false }
  if (code.endsWith('D')) {
    const base = code.slice(0, -1)
    if (KPI_CODES.has(base) || SUB_MEASURE_CODES.has(base)) {
      return { kpi: base, isDenominator: true }
    }
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

  // Post-process CRM08: pull the three sub-measures out of kpiRows into their
  // own breakdown structure, then synthesise the combined CRM08 payment KPI.
  const crm08A = kpiRows['CRM08A']
  const crm08B = kpiRows['CRM08B']
  const crm08C = kpiRows['CRM08C']
  const crm08Breakdown =
    crm08A || crm08B || crm08C
      ? {
          activity: crm08A ?? { numerator: 0, denominator: 0 },
          bmi:      crm08B ?? { numerator: 0, denominator: 0 },
          smoking:  crm08C ?? { numerator: 0, denominator: 0 },
        }
      : undefined

  if (crm08Breakdown) {
    const g12 = (groupSplit.group1 ?? 0) + (groupSplit.group2 ?? 0)
    const sumNum =
      crm08Breakdown.activity.numerator +
      crm08Breakdown.bmi.numerator +
      crm08Breakdown.smoking.numerator
    // If we don't yet know G1/G2 (they come in later after manual entry), keep
    // denominator at 0 — the UI will show "awaiting data" until groups land.
    kpiRows['CRM08'] = { numerator: sumNum, denominator: g12 }
  }
  delete kpiRows['CRM08A']
  delete kpiRows['CRM08B']
  delete kpiRows['CRM08C']

  // CRM09 denominator is G1+G2 per spec, not CRM09D from the CSV.
  if (kpiRows['CRM09']) {
    const g12 = (groupSplit.group1 ?? 0) + (groupSplit.group2 ?? 0)
    kpiRows['CRM09'] = {
      numerator: kpiRows['CRM09'].numerator,
      denominator: g12 || kpiRows['CRM09'].denominator,
    }
  }

  return {
    success: true,
    data: {
      lastRunTimestamp,
      populationCount,
      kpiRows,
      crm08Breakdown,
      groupSplit,
      weekNumber,
      reportType,
    },
  }
}
