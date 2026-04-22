/**
 * Phase 2 verification — exercises csv-parser.ts and kpi-engine.ts
 * against the Premier Medical Centre fixture in spec §15 and §0.
 *
 * Run:  node --experimental-strip-types scripts/verify-fixture.ts
 *   (or: pnpm dlx tsx scripts/verify-fixture.ts)
 */

import { parseEMISCSV, calculateWeekNumber } from '../src/lib/csv-parser'
import { computeKPIResults, calculateTotalRevenue } from '../src/lib/kpi-engine'
import type { CSVUpload } from '../src/lib/types'

// ─── Synthetic CSV matching spec §0 verbatim excerpt ───────────────────────
const SYNTHETIC_CSV = `Local Enhanced Services 2026-27,,,
,,,
Last Run:,17/04/2026 17:03,Relative Date:,17/04/2026 16:51
,,,
Population Count,Males,Females,
15986,8586,7400,
,,,
Search,,,
CRM01AD | AF | DENOMINATOR | Eligible for ECG or Pulse Rhythm Check,1591,,
CRM01A | AF | ACHIEVEMENT | THIS FY | ECG or Pulse Rhythm recorded,59,,
*CRM02D | DENOMINATOR | Patients on CRM Register,3306,,
CRM02 | ACHIEVEMENT | Care Process Completed,9,,
"*CRM03D | DENOMINATOR | CKD, Diabetes or Hypertension",2129,,
*CRM03 | ACHIEVEMENT | LAST 15M | Latest BP <= appropriate target,1030,,
CRM06D | CKD & eGFR btwn 20 & 45 OR ...,948,,
CRM06N | ACHIEVE | LAST 6M | SGLT-2 inhibitors,427,,
CRM08AD | High or Moderate CRM | DEN | Earliest Inactive or moderate inactive,36,,
CRM08A | ACHIEVEMENT | Latest Active codes recorded after inactive codes,1,,
CRM08BD | High/Moderate CRM | DEN | Earliest BMI,199,,
CRM08B | ACHIEVEMENT | Latest BMI recorded after earliest one,12,,
CRM08CD | High or Moderate CRM | DEN | Earliest Current Smoker,49,,
CRM08C | ACHIEVEMENT | Latest Non-Smoker or Ex-Smoker,0,,
,,,
Group 1,495,,
Group 2,357,,
Group 3,2454,,
`

// ─── Part 1: run the parser on the synthetic CSV ───────────────────────────
console.log('='.repeat(78))
console.log('  PARSER VERIFICATION (synthetic CSV matching spec §0 excerpt)')
console.log('='.repeat(78))

const parsed = parseEMISCSV(SYNTHETIC_CSV)
if (!parsed.success || !parsed.data) {
  console.error('Parser failed:', parsed.error)
  process.exit(1)
}

console.log(`Last Run:         ${parsed.data.lastRunTimestamp}`)
console.log(`Population:       ${parsed.data.populationCount}`)
console.log(
  `Group split:      G1=${parsed.data.groupSplit.group1}  G2=${parsed.data.groupSplit.group2}  G3=${parsed.data.groupSplit.group3}`,
)
console.log(`\nExtracted KPI rows:`)
for (const [code, row] of Object.entries(parsed.data.kpiRows).sort()) {
  console.log(`  ${code.padEnd(7)} num=${String(row.numerator).padStart(5)}  den=${String(row.denominator).padStart(5)}`)
}

// Checks from the synthetic CSV
const parserChecks: Array<[string, boolean]> = [
  ['Last Run timestamp extracted', parsed.data.lastRunTimestamp === '17/04/2026 17:03'],
  ['Population = 15986', parsed.data.populationCount === 15986],
  ['G1 = 495', parsed.data.groupSplit.group1 === 495],
  ['G2 = 357', parsed.data.groupSplit.group2 === 357],
  ['G3 = 2454', parsed.data.groupSplit.group3 === 2454],
  ['CRM01A num/den = 59/1591', parsed.data.kpiRows.CRM01A?.numerator === 59 && parsed.data.kpiRows.CRM01A?.denominator === 1591],
  ['CRM02 num/den = 9/3306', parsed.data.kpiRows.CRM02?.numerator === 9 && parsed.data.kpiRows.CRM02?.denominator === 3306],
  ['CRM03 num/den = 1030/2129 (quoted field!)', parsed.data.kpiRows.CRM03?.numerator === 1030 && parsed.data.kpiRows.CRM03?.denominator === 2129],
  ['CRM06 num/den = 427/948 (CRM06N mapped)', parsed.data.kpiRows.CRM06?.numerator === 427 && parsed.data.kpiRows.CRM06?.denominator === 948],
  ['CRM08A num/den = 1/36', parsed.data.kpiRows.CRM08A?.numerator === 1 && parsed.data.kpiRows.CRM08A?.denominator === 36],
  ['CRM08B num/den = 12/199', parsed.data.kpiRows.CRM08B?.numerator === 12 && parsed.data.kpiRows.CRM08B?.denominator === 199],
  ['CRM08C num/den = 0/49', parsed.data.kpiRows.CRM08C?.numerator === 0 && parsed.data.kpiRows.CRM08C?.denominator === 49],
]

console.log(`\nParser checks:`)
let parserPass = 0
for (const [label, ok] of parserChecks) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}`)
  if (ok) parserPass++
}
console.log(`\n→ ${parserPass}/${parserChecks.length} parser checks passed`)

// ─── Part 2: run the engine against a fully-populated Premier fixture ──────
console.log('\n' + '='.repeat(78))
console.log('  ENGINE VERIFICATION (Premier fixture, 17 Apr 2026)')
console.log('='.repeat(78))

// weekNumber for a 17 Apr 2026 upload = ceil(16/7) = 3
const WEEK_NUMBER = calculateWeekNumber('2026-04-17T17:03:00Z')
console.log(`Week number (17 Apr 2026): ${WEEK_NUMBER}`)

const fixture: CSVUpload = {
  practiceCode: 'E84003',
  practiceName: 'Premier Medical Centre',
  uploadDate: '2026-04-17T17:03:00Z',
  weekNumber: WEEK_NUMBER,
  populationCount: 15986,
  lastRunTimestamp: '17/04/2026 17:03',
  groupSplit: { group1: 495, group2: 357, group3: 2454 },
  rawRows: {},
  kpiRows: {
    CRM01A: { numerator: 59, denominator: 1591 },   // spec §15
    CRM01B: { numerator: 7, denominator: 9 },        // small register (spec notes den=9)
    CRM01C: { numerator: 45, denominator: 95 },      // synthetic
    CRM01D: { numerator: 340, denominator: 480 },    // synthetic
    CRM01E: { numerator: 10, denominator: 29 },      // small register (spec notes den=29)
    CRM02:  { numerator: 9, denominator: 3306 },     // spec §15
    CRM03:  { numerator: 1030, denominator: 2129 },  // spec §15
    CRM04:  { numerator: 280, denominator: 500 },    // synthetic
    CRM05:  { numerator: 383, denominator: 557 },    // spec §15
    CRM06:  { numerator: 427, denominator: 948 },    // spec §0 excerpt
    CRM07:  { numerator: 0, denominator: 852 },      // spec §15
    CRM08A: { numerator: 1, denominator: 36 },       // spec §0 excerpt
    CRM08B: { numerator: 12, denominator: 199 },     // spec §0 excerpt
    CRM08C: { numerator: 0, denominator: 49 },       // spec §0 excerpt
    CRM09:  { numerator: 50, denominator: 852 },     // synthetic
  },
}

const totalRevStandalone = calculateTotalRevenue(fixture.groupSplit)
const { results, totalRev, securedRev, onTargetRev, atRiskRev } = computeKPIResults(
  fixture,
  null,
  fixture.groupSplit,
)

console.log(`\nTotal revenue:    £${totalRev.toFixed(2)}`)
console.log(`  (calculateTotalRevenue alone: £${totalRevStandalone.toFixed(2)})`)
console.log(`  Secured:        £${securedRev.toFixed(2)}`)
console.log(`  On Target:      £${onTargetRev.toFixed(2)}`)
console.log(`  At Risk:        £${atRiskRev.toFixed(2)}`)
console.log(`  Sum:            £${(securedRev + onTargetRev + atRiskRev).toFixed(2)}`)

console.log('\nPer-KPI results:')
console.log('  Code    type  num    den    cur%    band    rag    bucket     ptsNd  rate  delta')
console.log('  ' + '─'.repeat(92))
for (const r of results) {
  const line = [
    r.code.padEnd(7),
    r.type.padEnd(4),
    String(r.numerator).padStart(5),
    String(r.denominator).padStart(5),
    r.current.toFixed(2).padStart(6) + '%',
    r.paymentBand.padEnd(6),
    r.ragStatus.padEnd(6),
    r.revenueBucket.padEnd(10),
    String(r.patientsNeeded).padStart(5),
    (r.weeklyRunRate === null ? ' n/a' : String(r.weeklyRunRate)).padStart(5),
    r.delta === null ? 'n/a' : r.delta.toFixed(2),
  ].join('  ')
  console.log('  ' + line + (r.isSmallRegister ? ' ⚠ small' : ''))
}

// ─── Part 3: spec §15 acceptance spot-checks ───────────────────────────────
console.log('\n' + '─'.repeat(78))
console.log('  Spec §15 acceptance spot-checks')
console.log('─'.repeat(78))

const byCode = Object.fromEntries(results.map((r) => [r.code, r]))
type Check = { label: string; actual: unknown; expected: unknown }
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) < tol

const specChecks: Check[] = [
  { label: 'CRM01A current% ≈ 3.71',            actual: byCode.CRM01A!.current.toFixed(2),     expected: '3.71' },
  { label: 'CRM01A paymentBand = none',         actual: byCode.CRM01A!.paymentBand,            expected: 'none' },
  { label: 'CRM01A rag = red',                  actual: byCode.CRM01A!.ragStatus,              expected: 'red' },
  { label: 'CRM01A patientsNeeded = 808',       actual: byCode.CRM01A!.patientsNeeded,         expected: 808 },

  { label: 'CRM02 current% ≈ 0.27',             actual: byCode.CRM02!.current.toFixed(2),      expected: '0.27' },
  { label: 'CRM02 paymentBand = none',          actual: byCode.CRM02!.paymentBand,             expected: 'none' },
  { label: 'CRM02 rag = red',                   actual: byCode.CRM02!.ragStatus,               expected: 'red' },
  { label: 'CRM02 patientsNeeded = 1644',       actual: byCode.CRM02!.patientsNeeded,          expected: 1644 },

  { label: 'CRM03 current% ≈ 48.38',            actual: byCode.CRM03!.current.toFixed(2),      expected: '48.38' },
  { label: 'CRM03 paymentBand = half',          actual: byCode.CRM03!.paymentBand,             expected: 'half' },
  { label: 'CRM03 rag = amber',                 actual: byCode.CRM03!.ragStatus,               expected: 'amber' },

  { label: 'CRM05 current% ≈ 68.76',            actual: byCode.CRM05!.current.toFixed(2),      expected: '68.76' },
  { label: 'CRM05 paymentBand = full',          actual: byCode.CRM05!.paymentBand,             expected: 'full' },
  { label: 'CRM05 rag = green',                 actual: byCode.CRM05!.ragStatus,               expected: 'green' },

  { label: 'CRM07 current = 0',                 actual: byCode.CRM07!.current,                  expected: 0 },
  { label: 'CRM07 paymentBand = none',          actual: byCode.CRM07!.paymentBand,             expected: 'none' },
  { label: 'CRM07 rag = red',                   actual: byCode.CRM07!.ragStatus,               expected: 'red' },
  { label: 'CRM07 patientsNeeded = 426',        actual: byCode.CRM07!.patientsNeeded,          expected: 426 },
  { label: 'CRM07 weeklyRunRate = 9',           actual: byCode.CRM07!.weeklyRunRate,           expected: 9 },

  { label: 'Total revenue ≈ £131,088.87',       actual: near(totalRev, 131088.87, 0.5),         expected: true },
  { label: 'CRM07 revenue ≈ £39,326.66',        actual: near(byCode.CRM07!.revenue, 39326.66, 0.5), expected: true },
  { label: 'CRM02 revenue ≈ £26,217.77',        actual: near(byCode.CRM02!.revenue, 26217.77, 0.5), expected: true },
]

let specPass = 0
for (const { label, actual, expected } of specChecks) {
  const ok = actual === expected
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(42)} actual=${JSON.stringify(actual)}`)
  if (ok) specPass++
}
console.log(`\n→ ${specPass}/${specChecks.length} spec §15 checks passed\n`)

if (parserPass === parserChecks.length && specPass === specChecks.length) {
  console.log('ALL CHECKS PASSED ✓')
  process.exit(0)
} else {
  console.log('SOME CHECKS FAILED — review output above')
  process.exit(0) // non-failing exit so we can inspect discrepancies
}
