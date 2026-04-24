'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TARIFFS } from '@/lib/constants'
import { fmt } from '@/lib/utils'
import type { GroupSplit } from '@/lib/types'

interface GroupSplitEntryProps {
  initialSplit: { group1: number | null; group2: number | null; group3: number | null }
  crmRegisterSize: number // denominator of CRM02 — total CRM register
  onConfirm: (split: GroupSplit) => void
  onCancel: () => void
}

export function GroupSplitEntry({
  initialSplit,
  crmRegisterSize,
  onConfirm,
  onCancel,
}: GroupSplitEntryProps) {
  const [g1, setG1] = useState<string>(
    initialSplit.group1 !== null ? String(initialSplit.group1) : '',
  )
  const [g2, setG2] = useState<string>(
    initialSplit.group2 !== null ? String(initialSplit.group2) : '',
  )

  const g1n = Number(g1)
  const g2n = Number(g2)
  const g1Valid = Number.isInteger(g1n) && g1n >= 0
  const g2Valid = Number.isInteger(g2n) && g2n >= 0
  const g3Derived =
    g1Valid && g2Valid
      ? Math.max(0, crmRegisterSize - g1n - g2n)
      : null

  const canConfirm = g1Valid && g2Valid
  const preview =
    canConfirm && g3Derived !== null
      ? g1n * TARIFFS.group1 + g2n * TARIFFS.group2 + g3Derived * TARIFFS.group3
      : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canConfirm || g3Derived === null) return
    onConfirm({ group1: g1n, group2: g2n, group3: g3Derived })
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-warning/30 bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Patient risk-group counts required
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We could not detect Group 1 (high risk) and Group 2 (moderate risk)
            patient counts in this CSV. Enter them below to continue.
            Group 3 will be derived as CRM register − G1 − G2.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GroupField
            id="group1"
            label="Group 1 · high risk"
            tariffLabel={`£${TARIFFS.group1.toFixed(2)}/yr per patient`}
            value={g1}
            onChange={setG1}
            valid={g1Valid}
          />
          <GroupField
            id="group2"
            label="Group 2 · moderate risk"
            tariffLabel={`£${TARIFFS.group2.toFixed(2)}/yr per patient`}
            value={g2}
            onChange={setG2}
            valid={g2Valid}
          />
        </div>

        <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Derived — Group 3 (lower risk)
          </p>
          <p className="text-base font-semibold text-foreground">
            {g3Derived !== null ? g3Derived.toLocaleString() : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            CRM register ({crmRegisterSize.toLocaleString()}) − G1 − G2 · £{TARIFFS.group3.toFixed(2)}/yr per patient
          </p>
        </div>

        {preview !== null ? (
          <p className="text-xs text-muted-foreground">
            Estimated maximum annual revenue:{' '}
            <span className="font-semibold text-foreground">
              {fmt(preview, { currency: true })}
            </span>
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canConfirm}>
            Confirm
          </Button>
        </div>
      </form>
    </div>
  )
}

interface GroupFieldProps {
  id: string
  label: string
  tariffLabel: string
  value: string
  onChange: (v: string) => void
  valid: boolean
}

function GroupField({ id, label, tariffLabel, value, onChange, valid }: GroupFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        aria-invalid={value !== '' && !valid}
      />
      <p className="mt-1 text-xs text-muted-foreground">{tariffLabel}</p>
    </div>
  )
}
