'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { TabId } from './Sidebar'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'kpis', label: 'KPI Performance' },
  { id: 'financials', label: 'Financials' },
  { id: 'practices', label: 'PCN Practices' },
]

interface TopBarProps {
  activeTab: TabId
  onTabChange: (id: TabId) => void
  dateBadgeLabel?: string
  trailingSlot?: ReactNode
}

export function TopBar({
  activeTab,
  onTabChange,
  dateBadgeLabel,
  trailingSlot,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/85 px-6 shadow-sm backdrop-blur">
      <nav aria-label="Primary">
        <ul className="flex gap-1">
          {TABS.map(({ id, label }) => {
            const active = id === activeTab
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onTabChange(id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3">
        {dateBadgeLabel ? (
          <span className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            {dateBadgeLabel}
          </span>
        ) : null}
        {trailingSlot}
      </div>
    </header>
  )
}
