import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { RAGStatus } from '@/lib/types'

const RAG_TO_BADGE: Record<RAGStatus, BadgeVariant> = {
  green: 'success',
  amber: 'warning',
  red:   'destructive',
}

const RAG_LABEL: Record<RAGStatus, string> = {
  green: 'On track',
  amber: 'At risk',
  red:   'Behind',
}

interface KPISectionProps {
  id?: string
  title: string
  subtitle?: string
  tariffLabel?: string // e.g. "20% of contract"
  rag?: RAGStatus
  children: ReactNode
  className?: string
}

export function KPISection({
  id,
  title,
  subtitle,
  tariffLabel,
  rag,
  children,
  className,
}: KPISectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm scroll-mt-20',
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {rag ? <Badge variant={RAG_TO_BADGE[rag]}>{RAG_LABEL[rag]}</Badge> : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {tariffLabel ? (
          <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {tariffLabel}
          </span>
        ) : null}
      </header>
      <div>{children}</div>
    </section>
  )
}
