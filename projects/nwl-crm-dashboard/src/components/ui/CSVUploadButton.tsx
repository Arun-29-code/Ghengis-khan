'use client'

import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { parseEMISCSV } from '@/lib/csv-parser'
import type { ParseResult } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CSVUploadButtonProps {
  onUpload: (result: ParseResult) => void
  disabled?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export function CSVUploadButton({
  onUpload,
  disabled = false,
  label = 'Upload CSV',
  size = 'md',
  className,
}: CSVUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    try {
      const text = await file.text()
      const result = parseEMISCSV(text)
      onUpload(result)
    } catch (err) {
      onUpload({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to read file',
      })
    } finally {
      setParsing(false)
      // Reset so the same file can be re-uploaded.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || parsing}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg bg-brand-gradient font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50',
          SIZE_CLASSES[size],
          className,
        )}
      >
        {parsing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="h-4 w-4" aria-hidden />
        )}
        {parsing ? 'Parsing…' : label}
      </button>
    </>
  )
}
