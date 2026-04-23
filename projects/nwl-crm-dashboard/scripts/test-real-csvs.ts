/**
 * Run the parser against the real Premier Medical Centre CSVs and print what
 * was extracted. Kept locally (folder `NWL reports/` is gitignored) so this
 * script is for development only.
 */

import { readFileSync } from 'node:fs'
import { parseEMISCSV } from '../src/lib/csv-parser'

const FILES = [
  'NWL reports/Local Enhanced Services 2026-27_report 1_RUN AT END OF YEAR.csv',
  'NWL reports/Local Enhanced Services 2026-27 _report 2_RUN TODAYS DATE.csv',
]

for (const path of FILES) {
  console.log('\n' + '='.repeat(78))
  console.log('  ' + path)
  console.log('='.repeat(78))
  const csv = readFileSync(path, 'utf8')
  const result = parseEMISCSV(csv)
  if (!result.success || !result.data) {
    console.error('PARSE FAILED:', result.error)
    continue
  }
  const d = result.data
  console.log(`reportType:       ${d.reportType}`)
  console.log(`lastRunTimestamp: ${d.lastRunTimestamp}`)
  console.log(`populationCount:  ${d.populationCount.toLocaleString()}`)
  console.log(`weekNumber:       ${d.weekNumber}`)
  console.log(`groupSplit:       G1=${d.groupSplit.group1}  G2=${d.groupSplit.group2}  G3=${d.groupSplit.group3}`)
  console.log(`\nkpiRows (${Object.keys(d.kpiRows).length}):`)
  for (const [code, row] of Object.entries(d.kpiRows).sort()) {
    const pct = row.denominator > 0 ? ((row.numerator / row.denominator) * 100).toFixed(2) : '—'
    console.log(`  ${code.padEnd(7)}  num=${String(row.numerator).padStart(5)}  den=${String(row.denominator).padStart(5)}  ${String(pct).padStart(6)}%`)
  }
}
