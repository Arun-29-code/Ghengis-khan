import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export interface FmtOptions {
  currency?: boolean
  decimals?: number
}

export function fmt(value: number, opts: FmtOptions = {}): string {
  if (opts.currency) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: opts.decimals ?? 0,
      minimumFractionDigits: opts.decimals ?? 0,
    }).format(value)
  }
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: opts.decimals ?? 1,
  }).format(value)
}

export function formatDate(iso: string, pattern: string = 'dd MMM yyyy'): string {
  return format(parseISO(iso), pattern)
}
