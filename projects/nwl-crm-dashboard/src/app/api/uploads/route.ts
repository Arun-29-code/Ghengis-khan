// Cross-device CSV persistence. Each upload lives in Vercel Blob as a parsed
// CSVUpload JSON keyed by {PRACTICE_ODS}/{type}/current.json. Two slots per
// practice (year-end, today). Storing the finalized CSVUpload (not the raw CSV)
// captures manually-entered group splits that aren't in the CSV itself.

import { NextResponse } from 'next/server'
import { list, put } from '@vercel/blob'
import { auth } from '@/auth'
import type { CSVUpload, ReportType } from '@/lib/types'

type SlotKey = 'year-end' | 'today'

function slotForReportType(reportType: ReportType): SlotKey {
  // 'unknown' falls back to year-end to match the store's routeUpload logic.
  return reportType === 'today' ? 'today' : 'year-end'
}

function blobKey(ods: string, slot: SlotKey): string {
  return `${ods}/${slot}/current.json`
}

function isCSVUpload(body: unknown): body is CSVUpload {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.practiceCode === 'string' &&
    typeof b.uploadDate === 'string' &&
    typeof b.reportType === 'string' &&
    typeof b.kpiRows === 'object' &&
    b.kpiRows !== null
  )
}

export async function GET() {
  const session = await auth()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const ods = process.env.PRACTICE_ODS
  if (!ods) return NextResponse.json({ yearEnd: null, today: null })

  const { blobs } = await list({ prefix: `${ods}/` })
  const yearEndKey = blobKey(ods, 'year-end')
  const todayKey = blobKey(ods, 'today')

  const slots: { yearEnd: CSVUpload | null; today: CSVUpload | null } = {
    yearEnd: null,
    today: null,
  }

  await Promise.all(
    blobs.map(async (b) => {
      if (b.pathname !== yearEndKey && b.pathname !== todayKey) return
      const res = await fetch(b.url, { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as CSVUpload
      if (b.pathname === yearEndKey) slots.yearEnd = data
      else slots.today = data
    }),
  )

  return NextResponse.json(slots)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const ods = process.env.PRACTICE_ODS
  if (!ods) return new NextResponse('PRACTICE_ODS not configured', { status: 500 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  if (!isCSVUpload(body)) {
    return new NextResponse('Body is not a CSVUpload', { status: 400 })
  }

  // @vercel/blob 0.27.x silently overwrites at the same path when addRandomSuffix
  // is false (no allowOverwrite flag in this version). Newer majors require it.
  const slot = slotForReportType(body.reportType)
  await put(blobKey(ods, slot), JSON.stringify(body), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  })

  return NextResponse.json({ ok: true, slot })
}
