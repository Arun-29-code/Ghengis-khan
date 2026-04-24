# NWL CRM Dashboard

Analytics dashboard for the NHS North West London (NWL) Cardiovascular-Renal-Metabolic
Local Enhanced Service 2026-27. Practices upload their EMIS CSV export; the dashboard
tracks KPI achievement, revenue at risk, and pace toward annual targets.

**First practice:** Premier Medical Centre (ODS: E84003), K&W West PCN
**Contract weeks:** 52 · **Tariffs:** G1 £107.08/y · G2 £53.13/y · G3 £24.09/y

## Getting started

```bash
pnpm install
cp .env.example .env.local    # then fill in the values
pnpm dev                      # → http://localhost:3000
```

See `NWL_CRM_DASHBOARD_BUILD_PROMPT.md` for the full build spec and `CLAUDE.md`
for agent orientation.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4 (CSS-first `@theme`)
- NextAuth v5 (beta, credentials provider)
- Zustand + localStorage persistence
- Recharts 3, Lucide icons, Papaparse, date-fns
- pnpm, deployed to Vercel

## Scripts

| Command       | Purpose                                 |
| ------------- | --------------------------------------- |
| `pnpm dev`    | Run the dev server on :3000             |
| `pnpm build`  | Production build                        |
| `pnpm start`  | Run the production build                |
| `pnpm lint`   | Run ESLint                              |
