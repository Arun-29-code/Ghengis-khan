import type { BadgeVariant } from '@/components/ui/Badge'
import type { PaymentBand, RAGStatus } from '@/lib/types'

export const RAG_COLOR: Record<RAGStatus, string> = {
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  red:   'var(--color-destructive)',
}

interface StatusBadge {
  variant: Extract<BadgeVariant, 'success' | 'warning' | 'destructive'>
  label: string
}

const RAG_BADGE: Record<RAGStatus, StatusBadge> = {
  green: { variant: 'success',     label: 'On track' },
  amber: { variant: 'warning',     label: 'At risk'  },
  red:   { variant: 'destructive', label: 'Behind'   },
}

/**
 * Badge priority:
 *  - paymentBand 'full' → green "Payment Secured" (spec §15 expects this literal
 *    wording when a KPI has crossed its 100% pay threshold).
 *  - otherwise, fall back to the RAG status label.
 */
export function deriveStatusBadge(
  paymentBand: PaymentBand,
  rag: RAGStatus,
): StatusBadge {
  if (paymentBand === 'full') {
    return { variant: 'success', label: 'Payment Secured' }
  }
  return RAG_BADGE[rag]
}
