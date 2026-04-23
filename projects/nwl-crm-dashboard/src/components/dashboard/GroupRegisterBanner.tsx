import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TARIFFS } from '@/lib/constants'

interface GroupRegisterBannerProps {
  group1: number | null
  group2: number | null
  group3: number | null
  /** CRM02 denominator from the parsed year-end CSV — the full CRM register. */
  crmRegister: number | null
}

export function GroupRegisterBanner({
  group1,
  group2,
  group3,
  crmRegister,
}: GroupRegisterBannerProps) {
  const groupSum = (group1 ?? 0) + (group2 ?? 0) + (group3 ?? 0)
  const registerNonNull = crmRegister ?? 0
  const showWarning =
    registerNonNull > 0 &&
    groupSum > 0 &&
    Math.abs(registerNonNull - groupSum) / registerNonNull > 0.1

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <GroupCard
        accent="border-l-destructive"
        label="Group 1 — High Risk"
        count={group1}
        tariff={TARIFFS.group1}
      />
      <GroupCard
        accent="border-l-warning"
        label="Group 2 — Moderate Risk"
        count={group2}
        tariff={TARIFFS.group2}
      />
      <GroupCard
        accent="border-l-success"
        label="Group 3 — Lower Risk"
        count={group3}
        tariff={TARIFFS.group3}
      />
      <RegisterCard
        count={crmRegister}
        showWarning={showWarning}
        groupSum={groupSum}
      />
    </div>
  )
}

interface GroupCardProps {
  accent: string
  label: string
  count: number | null
  tariff: number
}

function GroupCard({ accent, label, count, tariff }: GroupCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-l-4 border-border bg-card p-4 shadow-md',
        accent,
      )}
    >
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
        {count !== null ? count.toLocaleString() : '—'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        @ £{tariff.toFixed(2)} / patient / yr
      </p>
    </div>
  )
}

interface RegisterCardProps {
  count: number | null
  showWarning: boolean
  groupSum: number
}

function RegisterCard({ count, showWarning, groupSum }: RegisterCardProps) {
  const tooltip = showWarning
    ? `Group totals (${groupSum.toLocaleString()}) differ from full register (${(count ?? 0).toLocaleString()}) — only QRISK3-stratified patients appear in Groups 1–3. This is expected.`
    : undefined

  return (
    <div className="rounded-xl border border-l-4 border-border border-l-primary bg-card p-4 shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">CRM Register</p>
        {showWarning ? (
          <span
            className="inline-flex items-center text-warning"
            title={tooltip}
            aria-label={tooltip}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
        {count !== null ? count.toLocaleString() : '—'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Total registered patients</p>
    </div>
  )
}
