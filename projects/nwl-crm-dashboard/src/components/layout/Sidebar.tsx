'use client'

import type { ComponentType } from 'react'
import {
  LayoutDashboard,
  BarChart3,
  PoundSterling,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabId = 'overview' | 'kpis' | 'financials' | 'practices'

interface NavItem {
  id: TabId
  label: string
  icon: ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'kpis', label: 'KPI Performance', icon: BarChart3 },
  { id: 'financials', label: 'Financials', icon: PoundSterling },
  { id: 'practices', label: 'PCN Practices', icon: Building2 },
]

interface SidebarProps {
  activeTab: TabId
  onTabChange: (id: TabId) => void
  practiceName: string
  pcnName?: string
  lastUploadLabel: string | null
}

export function Sidebar({
  activeTab,
  onTabChange,
  practiceName,
  pcnName,
  lastUploadLabel,
}: SidebarProps) {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-sidebar-gradient text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-sm font-bold">
            GP
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              GP Automate
            </p>
            <p className="text-sm font-medium">NWL CRM</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold leading-snug">{practiceName}</p>
          {pcnName ? <p className="mt-0.5 text-xs text-white/60">{pcnName}</p> : null}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = id === activeTab
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onTabChange(id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                    active
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/60">
        {lastUploadLabel ? (
          <>
            <p className="font-semibold text-white/80">Last upload</p>
            <p>{lastUploadLabel}</p>
          </>
        ) : (
          <p>No uploads yet</p>
        )}
      </div>
    </aside>
  )
}
