import { Fragment } from 'react'
import { Badge } from '@/components/ui/Badge'
import { cn, fmt } from '@/lib/utils'
import { statusBadge } from '@/components/kpis/status'
import type { KPIResult, RevenueBucket } from '@/lib/types'

interface PriorityTableProps {
  results: KPIResult[]
}

const BUCKET_ORDER: RevenueBucket[] = ['atRisk', 'onTarget', 'secured']

const BUCKET_LABEL: Record<RevenueBucket, string> = {
  atRisk:   'Needs action',
  onTarget: 'On target',
  secured:  'Secured',
}

export function PriorityTable({ results }: PriorityTableProps) {
  const groups = BUCKET_ORDER.map((bucket) => ({
    bucket,
    rows: results
      .filter((r) => r.revenueBucket === bucket)
      .sort((a, b) => b.revenue - a.revenue),
  })).filter((g) => g.rows.length > 0)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">Priority list</h3>
        <p className="text-xs text-muted-foreground">
          All {results.length} KPIs ordered by urgency bucket and £ at stake
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-right">Current %</th>
              <th className="px-4 py-2 text-right">Δ week</th>
              <th className="px-4 py-2 text-right">Target</th>
              <th className="px-4 py-2 text-center">Status</th>
              <th className="px-4 py-2 text-right">Patients needed</th>
              <th className="px-4 py-2 text-right">£ at stake</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.bucket}>
                <tr className="bg-background">
                  <td
                    colSpan={8}
                    className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground"
                  >
                    {BUCKET_LABEL[group.bucket]} · {group.rows.length} KPI
                    {group.rows.length === 1 ? '' : 's'}
                  </td>
                </tr>
                {group.rows.map((r) => {
                  const badge = statusBadge(r.ragStatus)
                  return (
                    <tr key={r.code} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-xs text-foreground">
                        {r.code}
                      </td>
                      <td className="px-4 py-2 text-foreground">
                        {r.label}
                        {r.isSmallRegister ? (
                          <span
                            className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-warning"
                            title="Denominator < 20 — pace reading unreliable"
                          >
                            small
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-foreground">
                        {r.current.toFixed(1)}%
                      </td>
                      <td
                        className={cn(
                          'px-4 py-2 text-right tabular-nums',
                          r.delta === null
                            ? 'text-muted-foreground'
                            : r.delta >= 0
                              ? 'text-success'
                              : 'text-destructive',
                        )}
                      >
                        {r.delta === null
                          ? '—'
                          : `${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(1)}pp`}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {r.t100.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-foreground">
                        {r.patientsNeeded > 0 ? r.patientsNeeded.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-foreground">
                        {fmt(r.revenue, { currency: true })}
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
