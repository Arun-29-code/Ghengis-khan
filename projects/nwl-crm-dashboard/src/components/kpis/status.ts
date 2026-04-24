import type { BadgeVariant } from '@/components/ui/Badge'
import type { RAGStatus } from '@/lib/types'

export const RAG_COLOR: Record<RAGStatus, string> = {
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  red:   'var(--color-destructive)',
}

export interface StatusBadge {
  variant: Extract<BadgeVariant, 'success' | 'warning' | 'destructive'>
  label: string
}

/**
 * Canonical RAG → pill mapping. One source of truth for every status badge
 * in the dashboard (Overview priority table, KPI cards, KPI section headers,
 * horizontal-bar rows). Wording decided by Arun:
 *   green  → "Payment Secured"
 *   amber  → "On Track"
 *   red    → "Behind Pace"
 * Do not paraphrase these labels elsewhere — import from here instead.
 */
export const STATUS_BADGE: Record<RAGStatus, StatusBadge> = {
  green: { variant: 'success',     label: 'Payment Secured' },
  amber: { variant: 'warning',     label: 'On Track'        },
  red:   { variant: 'destructive', label: 'Behind Pace'     },
}

export function statusBadge(rag: RAGStatus): StatusBadge {
  return STATUS_BADGE[rag]
}
