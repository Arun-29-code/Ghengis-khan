import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CSVUpload, DashboardState, GroupSplit } from '@/lib/types'
import { computeKPIResults } from '@/lib/kpi-engine'

interface DashboardStore extends DashboardState {
  addUpload: (upload: CSVUpload) => void
  clearHistory: () => void
  setGroupSplitOverride: (split: GroupSplit) => void
}

const initialState: DashboardState = {
  currentUpload: null,
  previousUpload: null,
  uploadHistory: [],
  kpiResults: [],
  totalRevenue: 0,
  securedRevenue: 0,
  onTargetRevenue: 0,
  atRiskRevenue: 0,
  groupSplitOverride: null,
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addUpload: (upload) => {
        const { currentUpload, uploadHistory, groupSplitOverride } = get()
        const newHistory = [upload, ...uploadHistory].slice(0, 52)
        const effectiveSplit = groupSplitOverride ?? upload.groupSplit

        const { results, totalRev, securedRev, onTargetRev, atRiskRev } =
          computeKPIResults(upload, currentUpload, effectiveSplit)

        set({
          previousUpload: currentUpload,
          currentUpload: upload,
          uploadHistory: newHistory,
          kpiResults: results,
          totalRevenue: totalRev,
          securedRevenue: securedRev,
          onTargetRevenue: onTargetRev,
          atRiskRevenue: atRiskRev,
        })
      },

      clearHistory: () => set({ ...initialState }),

      setGroupSplitOverride: (split) => {
        set({ groupSplitOverride: split })
        const { currentUpload, previousUpload } = get()
        if (!currentUpload) return
        const { results, totalRev, securedRev, onTargetRev, atRiskRev } =
          computeKPIResults(currentUpload, previousUpload, split)
        set({
          kpiResults: results,
          totalRevenue: totalRev,
          securedRevenue: securedRev,
          onTargetRevenue: onTargetRev,
          atRiskRevenue: atRiskRev,
        })
      },
    }),
    {
      name: 'nwl-crm-dashboard-v1',
      storage: createJSONStorage(() => localStorage),
      // Avoid SSR hydration mismatches — rehydrate on mount from <StoreHydrator/>.
      skipHydration: true,
    },
  ),
)
