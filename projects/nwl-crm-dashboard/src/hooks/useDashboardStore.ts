import { create } from 'zustand'
import type {
  CSVUpload,
  DashboardState,
  GroupSplit,
  ReportType,
} from '@/lib/types'
import { computeKPIResults } from '@/lib/kpi-engine'

interface DashboardStore extends DashboardState {
  addUpload: (upload: CSVUpload) => void
  hydrate: (yearEnd: CSVUpload | null, today: CSVUpload | null) => void
  clearAll: () => void
  setGroupSplitOverride: (split: GroupSplit) => void
}

const initialState: DashboardState = {
  yearEndUpload: null,
  yearEndPrevious: null,
  todayUpload: null,
  todayPrevious: null,
  kpiResults: [],
  totalRevenue: 0,
  securedRevenue: 0,
  onTargetRevenue: 0,
  atRiskRevenue: 0,
  groupSplitOverride: null,
}

/**
 * Merge two uploads into a single synthetic CSVUpload so the KPI engine can
 * see all 13 KPIs at once. Year-end provides groups + cumulative KPIs +
 * CRM01-03, 07-09. Today provides CRM04-06.
 */
function mergeUploads(
  yearEnd: CSVUpload | null,
  today: CSVUpload | null,
): CSVUpload | null {
  if (!yearEnd && !today) return null
  // Use year-end as primary for metadata (week number, population, practice);
  // today's "population" is a search subset and isn't what we want to display.
  const primary = (yearEnd ?? today) as CSVUpload
  return {
    ...primary,
    kpiRows: {
      ...(yearEnd?.kpiRows ?? {}),
      ...(today?.kpiRows ?? {}),
    },
    groupSplit: yearEnd?.groupSplit ?? today?.groupSplit ?? {
      group1: 0,
      group2: 0,
      group3: 0,
    },
    weekNumber: yearEnd?.weekNumber ?? today?.weekNumber ?? 1,
  }
}

function recompute(args: {
  yearEndCurrent: CSVUpload | null
  yearEndPrev: CSVUpload | null
  todayCurrent: CSVUpload | null
  todayPrev: CSVUpload | null
  groupSplitOverride: GroupSplit | null
}): Pick<
  DashboardState,
  'kpiResults' | 'totalRevenue' | 'securedRevenue' | 'onTargetRevenue' | 'atRiskRevenue'
> {
  const merged = mergeUploads(args.yearEndCurrent, args.todayCurrent)
  if (!merged) {
    return {
      kpiResults: [],
      totalRevenue: 0,
      securedRevenue: 0,
      onTargetRevenue: 0,
      atRiskRevenue: 0,
    }
  }
  const mergedPrev = mergeUploads(args.yearEndPrev, args.todayPrev)
  const effectiveSplit = args.groupSplitOverride ?? merged.groupSplit
  const { results, totalRev, securedRev, onTargetRev, atRiskRev } =
    computeKPIResults(merged, mergedPrev, effectiveSplit)
  return {
    kpiResults: results,
    totalRevenue: totalRev,
    securedRevenue: securedRev,
    onTargetRevenue: onTargetRev,
    atRiskRevenue: atRiskRev,
  }
}

/** Returns the new slot state after receiving an upload of the given type. */
function routeUpload(
  state: DashboardState,
  upload: CSVUpload,
): Pick<DashboardState, 'yearEndUpload' | 'yearEndPrevious' | 'todayUpload' | 'todayPrevious'> {
  const type: ReportType = upload.reportType
  if (type === 'today') {
    return {
      yearEndUpload: state.yearEndUpload,
      yearEndPrevious: state.yearEndPrevious,
      todayUpload: upload,
      todayPrevious: state.todayUpload,
    }
  }
  // Year-end is the default for 'year-end' and also 'unknown' (safest fallback
  // since the year-end report is the one carrying groups + most KPIs).
  return {
    yearEndUpload: upload,
    yearEndPrevious: state.yearEndUpload,
    todayUpload: state.todayUpload,
    todayPrevious: state.todayPrevious,
  }
}

// Source of truth lives in Vercel Blob (server-side); the store is a derived
// in-memory cache hydrated on dashboard mount via /api/uploads. No persist
// middleware — switching browsers must show the same data, which means
// localStorage was the wrong source of truth.
export const useDashboardStore = create<DashboardStore>()((set, get) => ({
  ...initialState,

  addUpload: (upload) => {
    const state = get()
    const slots = routeUpload(state, upload)
    const computed = recompute({
      yearEndCurrent: slots.yearEndUpload,
      yearEndPrev: slots.yearEndPrevious,
      todayCurrent: slots.todayUpload,
      todayPrev: slots.todayPrevious,
      groupSplitOverride: state.groupSplitOverride,
    })
    set({ ...slots, ...computed })
  },

  // Seed both slots from the server in one set() so recompute runs once.
  // Previous-slot state is intentionally null — server only stores current,
  // so cross-device delta resets until the next upload populates "previous".
  hydrate: (yearEnd, today) => {
    const state = get()
    const computed = recompute({
      yearEndCurrent: yearEnd,
      yearEndPrev: null,
      todayCurrent: today,
      todayPrev: null,
      groupSplitOverride: state.groupSplitOverride,
    })
    set({
      yearEndUpload: yearEnd,
      yearEndPrevious: null,
      todayUpload: today,
      todayPrevious: null,
      ...computed,
    })
  },

  clearAll: () => set({ ...initialState }),

  setGroupSplitOverride: (split) => {
    const state = get()
    const computed = recompute({
      yearEndCurrent: state.yearEndUpload,
      yearEndPrev: state.yearEndPrevious,
      todayCurrent: state.todayUpload,
      todayPrev: state.todayPrevious,
      groupSplitOverride: split,
    })
    set({ groupSplitOverride: split, ...computed })
  },
}))
