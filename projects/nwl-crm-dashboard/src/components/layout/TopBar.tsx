'use client'

import { Upload } from 'lucide-react'
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
  onUploadClick?: () => void
  dateBadgeLabel?: string
  uploading?: boolean
}

export function TopBar({
  activeTab,
  onTabChange,
  onUploadClick,
  dateBadgeLabel,
  uploading = false,
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
        <button
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-gradient px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading…' : 'Upload CSV'}
        </button>
      </div>
    </header>
  )
}
