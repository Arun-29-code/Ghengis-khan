import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  CSVUpload,
  DashboardState,
  GroupSplit,
  ReportType,
} from '@/lib/types'
import { computeKPIResults } from '@/lib/kpi-engine'

interface DashboardStore extends DashboardState {
  addUpload: (upload: CSVUpload) => void
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

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
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
    }),
    {
      // Bump the store name (v1 → v2) so any previously-persisted single-slot
      // state is effectively discarded rather than reloaded into the new shape.
      name: 'nwl-crm-dashboard-v2',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)
