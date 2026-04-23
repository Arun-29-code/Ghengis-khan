import type { KPIConfig, PCNPractice } from './types'

export const TARIFFS = {
  group1: 107.08,
  group2: 53.13,
  group3: 24.09,
} as const

export const CONTRACT_WEEKS = 52
export const CONTRACT_START = '2026-04-01'

// 13 KPIs — weights must sum to 100
export const KPI_CONFIG: KPIConfig[] = [
  { code: 'CRM01A', label: 'AF Coding',             short: 'AF',        t100: 54.4, t50: 50.3, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM01B', label: 'CKD Coding',            short: 'CKD',       t100: 82.2, t50: 80.3, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM01C', label: 'Diabetes Coding',       short: 'DM',        t100: 52.5, t50: 45.3, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM01D', label: 'HTN Coding',            short: 'HTN',       t100: 74.8, t50: 72.7, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM01E', label: 'NDH Coding',            short: 'NDH',       t100: 41.0, t50: 41.0, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM02',  label: 'Care Processes',        short: 'Processes', t100: 50.0, t50: 30.0, weight: 20, type: 'C', group: '02' },
  { code: 'CRM03',  label: 'BP ≤130/80',            short: 'BP',        t100: 49.8, t50: 48.5, weight: 5,  type: 'S', group: '0306' },
  { code: 'CRM04',  label: 'Statin Prescribing',    short: 'Statins',   t100: 57.9, t50: 56.8, weight: 5,  type: 'S', group: '0306' },
  { code: 'CRM05',  label: 'ACEI/ARB',              short: 'ACEI/ARB',  t100: 66.1, t50: 65.6, weight: 5,  type: 'S', group: '0306' },
  { code: 'CRM06',  label: 'SGLT-2 Inhibitor',      short: 'SGLT-2',    t100: 42.5, t50: 38.8, weight: 5,  type: 'S', group: '0306' },
  { code: 'CRM07',  label: 'Holistic Care Plan',    short: 'Care Plan', t100: 50.0, t50: 30.0, weight: 30, type: 'C', group: '07' },
  // CRM08 is ONE payment KPI. Denominator is G1+G2; numerator is the sum of
  // the three sub-measure numerators (activity / BMI / smoking). The three
  // sub-measures are informational and live on CSVUpload.crm08Breakdown.
  { code: 'CRM08',  label: 'Lifestyle Improvement', short: 'Lifestyle', t100: 2.5,  t50: 2.0,  weight: 5,  type: 'C', group: '0809' },
  // CRM09 denominator is also G1+G2 (spec) — the parser overrides what the CSV
  // lists (CRM09D), which is the high/moderate register, not what gets paid on.
  { code: 'CRM09',  label: 'Health Confidence',     short: 'HCS',       t100: 50.0, t50: 30.0, weight: 5,  type: 'C', group: '0809' },
]

// Invariant: weights must sum to 100. Crash loud at import time if a config typo drifts it.
const totalWeight = KPI_CONFIG.reduce((sum, k) => sum + k.weight, 0)
if (totalWeight !== 100) {
  throw new Error(`KPI weights sum to ${totalWeight}, expected 100`)
}

export const PCN_PRACTICES: PCNPractice[] = [
  { name: 'Premier Medical Centre',        ods: 'E84003' },
  { name: 'Alperton Medical Centre',       ods: 'E84638' },
  { name: 'GP Pathfinder Clinics',         ods: 'E84066' },
  { name: 'Lancelot Medical Centre',       ods: 'E84063' },
  { name: 'Stanley Corner Medical Centre', ods: null },
  { name: 'Sudbury & Alperton MC',         ods: null },
  { name: 'The Wembley Practice',          ods: 'Y02692' },
]

export const CRM06_NUMERATOR_CODE = 'CRM06N'

export const CHART_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#f97316', // Orange
]

export const REVENUE_COLORS = {
  secured:  '#22c55e',
  onTarget: '#0059c7',
  atRisk:   '#ef4444',
} as const
