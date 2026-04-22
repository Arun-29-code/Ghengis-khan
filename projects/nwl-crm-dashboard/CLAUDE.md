@AGENTS.md

# NWL CRM Dashboard — Agent Orientation

This file exists so any AI agent (Claude Code or otherwise) can understand the
codebase without additional context from the original developer.

## What this app does
Analytics dashboard for the NHS North West London (NWL) Cardiovascular-Renal-Metabolic
(CRM) Local Enhanced Service 2026-27. GPs upload their EMIS clinical system CSV
export weekly; the dashboard tracks KPI achievement against annual targets and
estimates revenue at risk.

## Key business rules
1. 13 KPIs, each weighted % of total contract value (weights sum to 100).
2. Cumulative KPIs (`type='C'`): RAG = pace-based (current% / expectedAtPace%).
   Static KPIs (`type='S'`, CRM03-06): RAG = threshold-based (current% vs t100/t50).
3. If the gap between expected and actual patients < 1, treat as on-track (rounding).
4. Small registers (denominator < 20): pace % unreliable — show caveat, don't use for RAG.
5. Group 3 patients = CRM register size (CRM02 denominator) − Group 1 − Group 2.
6. Revenue bucket: full payment → `secured`; on-track or half-pay → `onTarget`; else → `atRisk`.

## Critical file locations
- Business logic:   `src/lib/kpi-engine.ts`
- CSV parsing:      `src/lib/csv-parser.ts`
- All KPI config:   `src/lib/constants.ts` (KPI_CONFIG, TARIFFS, PCN_PRACTICES)
- Types:            `src/lib/types.ts`
- State:            `src/hooks/useDashboardStore.ts` (Zustand + localStorage)
- Auth:             `src/auth.ts` + `src/middleware.ts`
- Design tokens:    `src/styles/globals.css` (Tailwind v4 `@theme`)

## Known edge cases
- CRM06 numerator in the CSV is coded `CRM06N`, not `CRM06`. Parser maps it.
- CRM08 has A/B/C sub-KPIs, each with its own denominator (CRM08AD/BD/CD). All three are shown individually; there is no single "CRM08" overall row.
- CRM01B and CRM01E have very small registers in the Premier fixture — flag these.
- If Group 1/2/3 rows are not detected in the CSV, the UI shows a manual input modal before the dashboard renders.
- Rows with commas in the description are quoted in the CSV — parser must respect quoting.

## Acceptance test fixture
Premier Medical Centre · 17 Apr 2026 · G1=495 · G2=357 · G3=2454
Expected total revenue: £131,089. CRM07 should show 0% and 9 care plans/week.

## Tech stack notes
- **Next.js 16** (App Router) — see AGENTS.md above; this is newer than the spec's stated Next.js 14 and some APIs differ.
- **Tailwind CSS v4** (CSS-first) — design tokens live in `src/styles/globals.css` via the `@theme` directive; no `tailwind.config.ts`.
- **Recharts 3** — API is largely compatible with spec's Recharts 2.x.
- **NextAuth v5 beta** — matches spec.
- **pnpm** — matches spec.

## DO NOT
- Do not add features outside the Phase 1 scope (see spec §1) without asking Arun.
- Do not hard-code hex values in components — always use CSS custom properties or Tailwind tokens.
- Do not use Chart.js — use Recharts only.
- Do not add patient-level data handling (regulatory risk — see Ghengis-khan CLAUDE.md).
