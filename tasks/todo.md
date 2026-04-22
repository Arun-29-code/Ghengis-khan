# Tasks — Ghengis-khan

This file is the working task list for the current Claude Code session. Claude Code writes plans here before starting work, ticks items off as it goes, and adds a review section at the bottom when done.

---

## Current task
Build the NWL CRM Dashboard (`projects/nwl-crm-dashboard`) from the spec in `projects/nwl-crm-dashboard/NWL_CRM_DASHBOARD_BUILD_PROMPT.md`.

- **Branch:** `claude/nwl-crm-dashboard-build-01`
- **Tech mismatches resolved** (confirmed by Arun): Next.js 16 (spec said 14), Tailwind v4 CSS-first (spec said v3 config file), Recharts 3 (spec said 2).
- **Check-in cadence:** pause after Phase 2 (business logic verified with spot-check numbers against the Premier fixture), then again at the end.

## Plan

### Phase 1 — Foundation
- [x] Write `projects/nwl-crm-dashboard/CLAUDE.md` (spec §16)
- [x] Write `.env.example`, `vercel.json`, updated `README.md`
- [x] Write `src/lib/types.ts` (spec §6.1)
- [x] Write `src/lib/constants.ts` — KPI_CONFIG, TARIFFS, PCN_PRACTICES, CHART_COLORS (spec §6.2, §4.3)
- [x] Write `src/lib/utils.ts` — cn(), fmt(), formatDate()
- [x] Write `src/styles/globals.css` — Tailwind v4 `@theme` with design tokens (spec §4.1 translated)
- [x] Update `src/app/globals.css` — import chain
- [ ] Commit: `Add foundation: types, constants, design tokens`

### Phase 2 — Business logic
- [x] Write `src/lib/csv-parser.ts` (spec §7) — handle `*` prefix, quoted fields, CRM06N mapping, Group 1/2/3 regex, CRM08 A/B/C sub-KPIs
- [x] Write `src/lib/kpi-engine.ts` (spec §8) — RAG (pace + threshold), revenue buckets, patients needed, run rate, delta
- [x] Write `scripts/verify-fixture.ts` — runs parser + engine against the Premier fixture
- [x] Verify: parser 12/12 clean; engine 18/22 spec checks pass — 4 discrepancies are spec-internal inconsistencies (CRM01A rag, CRM01A ptsNeeded off-by-1, CRM03 paymentBand, CRM03 rag) — see chat for analysis
- [x] Commit: `Add CSV parser and KPI engine`
- [ ] **→ PAUSE: check in with Arun before Phase 3**

### Phase 3 — Auth + login
- [x] `src/auth.ts`, `src/middleware.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/login/page.tsx` (+ `login/actions.ts` server action)
- [x] Verify: `/login` renders 200; `/api/auth/session` returns `null`; providers list Credentials. Full end-to-end auth flow deferred to Phase 10 browser test.
- [x] Commit: `Add auth with credentials provider`

### Phase 4 — Layout shell + state
- [x] Update `src/app/layout.tsx` (Inter font, clean metadata)
- [x] Write `src/app/page.tsx` (server redirect based on `auth()`)
- [x] `src/components/layout/{Sidebar,TopBar,DashboardLayout}.tsx` (all client)
- [x] `src/hooks/useDashboardStore.ts` — Zustand + persist (skipHydration to avoid SSR mismatch, rehydrate on mount)
- [x] `src/app/dashboard/page.tsx` (renders `<DashboardLayout>`; tab content stubs inside DashboardLayout itself)
- [x] Added `authorized` callback to `src/auth.ts` so middleware actually redirects unauth users
- [x] Commit: `Add dashboard layout and store`

### Phase 5 — Shared UI primitives
- [x] `src/components/ui/{Badge,StatsCard,UploadBanner,Button,CSVUploadButton}.tsx`
- [x] `src/components/kpis/{GaugeSVG,KPISection}.tsx`
- [x] Commit: `Add shared UI components`

### Phase 6 — Overview tab
- [x] `src/components/overview/{HeadlineCards,RevenuePipeline,PriorityTable}.tsx` + `OverviewTab` wrapper + `GroupSplitEntry` panel for missing G1/G2
- [x] Wire into `DashboardLayout` with empty/loaded state (spec §12), owning the upload handler and G3 derivation (CRM register − G1 − G2)
- [x] `TopBar` refactored to accept `trailingSlot` (CSVUploadButton lives there)
- [x] `dashboard/page.tsx` passes `practiceOds` (server reads env; client can't)
- [x] Renamed `middleware.ts` → `proxy.ts` (Next 16 deprecation); lesson logged in `tasks/lessons.md`
- [x] Commit: `Add Overview tab`

### Phase 7 — KPI Performance tab
- [x] `src/components/kpis/{KPISmallCard,KPIWideCard,KPIHBarRow}.tsx`
- [x] `src/components/kpis/KPITab.tsx` — sections for CRM01 (5 bars), CRM02 (wide), CRM03–06 (4 small), CRM07 (wide), CRM08A/B/C + CRM09 (4 small); each section badge shows worst RAG
- [x] Sidebar sub-nav items when `activeTab === 'kpis'`; `scrollIntoView` + `animate-nav-flash` on section land
- [x] Commit: `Add KPI Performance tab`

### Phase 8 — Financials tab
- [ ] `src/components/financials/{GroupTariffCards,RevenueDonutChart}.tsx` (spec §10.6)
- [ ] Commit: `Add Financials tab`

### Phase 9 — PCN Practices tab
- [ ] `src/components/practices/PracticeCard.tsx` + grid of 7 K&W West practices
- [ ] Commit: `Add PCN Practices tab`

### Phase 10 — Verify + polish
- [ ] Run all 11 acceptance tests (spec §15)
- [ ] Fix any issues found
- [ ] Fill in Review section below; update `tasks/lessons.md` if any corrections surfaced
- [ ] Commit: `Pass acceptance tests`

## Review
_(to be filled in on completion)_

---

## How this file is used
1. **Plan First** — Claude Code writes the plan here before touching any code.
2. **Verify Plan** — Arun checks the plan before implementation starts.
3. **Track Progress** — Items are ticked off as they're completed.
4. **Document Results** — Review section is filled in at the end.
5. **Archive** — When a task is fully done and reviewed, the entry can be moved to `tasks/archive.md` (create this file when needed) so this file stays focused on what's live.
