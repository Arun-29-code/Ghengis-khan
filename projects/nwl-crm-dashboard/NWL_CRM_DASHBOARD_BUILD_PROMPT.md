# NWL CRM Dashboard — Claude Code Build Prompt

Paste this entire document into Claude Code (the CLI) as your opening message.
Claude Code will build the full Next.js application autonomously.
The project is designed so that a second agent can debug or review it without any additional context — all key business rules, edge cases, and acceptance criteria are embedded below.


0. CONFIRMED CSV FORMAT (read this before writing the parser)
The actual EMIS export has been inspected. Key facts confirmed:
Structure: 4-column CSV (comma-separated). Column 0 = CODE | description, Column 1 = count, Columns 2–3 = empty.
Actual rows (verbatim excerpt):
Local Enhanced Services 2026-27,,,
,,,
Last Run:,17/04/2026 17:03,Relative Date:,17/04/2026 16:51
,,,
Population Count,Males,Females,
15986,8586,7400,
,,,
Search,,,
CRM01AD | AF | DENOMINATOR | Eligible for ECG or Pulse Rhythm Check,1591,,
CRM01A | AF | ACHIEVEMENT | THIS FY | ECG or Pulse Rhythm recorded,59,,
*CRM02D | DENOMINATOR | Patients on CRM Register,3306,,
CRM02 | ACHIEVEMENT | Care Process Completed,9,,
"*CRM03D | DENOMINATOR | CKD, Diabetes or Hypertension",2129,,
*CRM03 | ACHIEVEMENT | LAST 15M | Latest BP <= appropriate target,1030,,
CRM06D | CKD & eGFR btwn 20 & 45 OR ...,948,,
CRM06N | ACHIEVE | LAST 6M | SGLT-2 inhibitors,427,,
CRM08AD | High or Moderate CRM | DEN | Earliest Inactive or moderate inactive,36,,
CRM08A | ACHIEVEMENT | Latest Active codes recorded after inactive codes,1,,
CRM08BD | High/Moderate CRM | DEN | Earliest BMI,199,,
CRM08B | ACHIEVEMENT | Latest BMI recorded after earliest one,12,,
CRM08CD | High or Moderate CRM | DEN | Earliest Current Smoker,49,,
CRM08C | ACHIEVEMENT | Latest Non-Smoker or Ex-Smoker,0,,
...
Group 1,485,,
Group 2,285,,
Group 3,186,,
Critical parsing notes from real CSV:

* prefix appears on CRM02D, CRM03D, CRM03 — strip before matching
Rows with commas in description are quoted: "*CRM03D | DENOMINATOR | CKD, Diabetes or Hypertension",2129,,
CRM06 numerator code is CRM06N (not CRM06)
CRM08 has THREE sub-KPIs, each with its own denominator:

CRM08A: den=36 (Physical activity), CRM08AD denominator
CRM08B: den=199 (BMI), CRM08BD denominator
CRM08C: den=49 (Smoking), CRM08CD denominator
These are NOT the same as CRM07D (852)


Group split format: Group 1,485,, — first column text, second column count
Population row: two rows — header row Population Count,Males,Females, then values 15986,8586,7400,

CRM08 handling: Parse all three sub-KPIs (A/B/C) individually. Show all three as separate small cards in the CRM08–09 section. There is NO single "CRM08" overall — the section badge shows the RAG of the worst sub-KPI.
Group 1/2/3 note: These numbers will not necessarily equal the CRM register total (CRM02D). That is expected — only QRISK3-stratified patients appear in G1/2/3. Always show a validation message if G1+G2+G3 differs significantly from CRM07D (High+Moderate risk patients), but do not block the dashboard.

0. AGENT INSTRUCTIONS
You are building a production Next.js web application from scratch. Work through the sections in order. After completing each numbered section, create a git commit. If you encounter anything genuinely ambiguous (not covered below), ask rather than guess — but the spec is intentionally comprehensive so this should be rare.
Key constraints:

Do not deviate from the design system colour tokens defined in Section 4.
Do not add features not listed here. This is an MVP — keep scope tight.
Every file must be TypeScript (.tsx / .ts). No .js files.
Use pnpm as the package manager.
The app must pass the acceptance tests in Section 10 before you consider it done.


1. PROJECT OVERVIEW
App name: NWL CRM Dashboard
Repo name: nwl-crm-dashboard
Purpose: Analytics dashboard for the NHS North West London (NWL) Cardiovascular-Renal-Metabolic (CRM) Local Enhanced Service 2026–27. Practices upload their EMIS clinical system CSV export; the dashboard tracks KPI achievement, revenue at risk, and pace toward annual targets.
First practice: Premier Medical Centre (ODS: E84003), K&W West PCN
Contract value: £131,089/year (calculated dynamically from CSV data)
Contract weeks: 52
Phase 1 scope (build this):

Login page (email + password, single-practice auth)
CSV upload + parsing (EMIS export format, see Section 6)
Dashboard with 4 tabs: Overview, KPI Performance, Financials, PCN Practices
Data persisted in browser localStorage (multi-upload, week-on-week delta)
Deployment to Vercel

Out of scope (do NOT build):

Patient-level data or recall lists
Multi-tenancy / practice management admin
Real-time data fetching
Native mobile


2. TECH STACK
LayerChoiceNotesFrameworkNext.js 14 (App Router)'use client' for all interactive componentsLanguageTypeScript 5Strict mode onStylingTailwind CSS v3Custom tokens in globals.css, never hard-code hexAuthNextAuth.js v5 (beta)Credentials provider, JWT sessionsChartsRecharts 2.xWrapped in custom componentsIconsLucide ReactNo emojis as iconsCSV parsingPapaparseClient-side onlyStateZustandDashboard store; LocalStorage persistence via persist middlewarePackage managerpnpmDeploymentVercel

3. INITIAL SETUP COMMANDS
Run these before invoking Claude Code:
bashpnpm create next-app@latest nwl-crm-dashboard \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd nwl-crm-dashboard

pnpm add next-auth@beta \
  recharts \
  lucide-react \
  papaparse \
  zustand \
  @types/papaparse \
  clsx \
  tailwind-merge \
  date-fns

pnpm add -D @types/node

4. DESIGN SYSTEM — GPA PORTAL TOKENS
This app must visually match the GPA portal design system. All colours, radii and shadows are expressed as CSS custom properties. Never use raw hex or Tailwind colour classes for brand colours.
4.1 CSS Variables (src/styles/globals.css)
css@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Palette */
    --background:       210 40% 98%;
    --foreground:       222 47% 8%;
    --primary:          213 100% 39%;        /* #0059c7 */
    --primary-dark:     213 100% 29%;        /* #003d8f */
    --primary-light:    213 100% 49%;        /* #1a7ce0 */
    --secondary:        194 100% 47%;        /* #00b7f1 */
    --muted:            210 40% 96%;
    --muted-foreground: 215 20% 35%;
    --accent:           214 31.8% 91.4%;
    --destructive:      0 84% 60%;
    --success:          142 71% 45%;
    --warning:          38 92% 50%;
    --border:           214 32% 91%;
    --card:             0 0% 100%;

    /* Border radius */
    --radius-sm:   0.5rem;    /* 8px  */
    --radius:      0.75rem;   /* 12px */
    --radius-lg:   1rem;      /* 16px */
    --radius-xl:   1.25rem;   /* 20px */
    --radius-full: 9999px;

    /* Sidebar (Primary variant) */
    --sidebar-bg-from: #003d8f;
    --sidebar-bg-to:   #002060;
  }
}
4.2 Tailwind Config (tailwind.config.ts)
Extend the default theme:
tsimport type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background:       'hsl(var(--background))',
        foreground:       'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          dark:    'hsl(var(--primary-dark))',
          light:   'hsl(var(--primary-light))',
          foreground: '#ffffff',
        },
        secondary:        'hsl(var(--secondary))',
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent:           'hsl(var(--accent))',
        destructive:      'hsl(var(--destructive))',
        success:          'hsl(var(--success))',
        warning:          'hsl(var(--warning))',
        border:           'hsl(var(--border))',
        card:             'hsl(var(--card))',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #00b7f1, #0059c7)',
        'sidebar-gradient': 'linear-gradient(180deg, var(--sidebar-bg-from) 0%, var(--sidebar-bg-to) 100%)',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
}
export default config
4.3 Chart Colour Palette
Always use these for chart data series (cycle via index):
tsexport const CHART_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#f97316', // Orange
]

// Semantic overrides (use instead of CHART_COLORS when context is known)
export const REVENUE_COLORS = {
  secured:  '#22c55e',
  onTarget: '#0059c7',
  atRisk:   '#ef4444',
}

5. FILE STRUCTURE
Create this exact directory structure:
nwl-crm-dashboard/
├── CLAUDE.md                          ← AI agent orientation file (write this FIRST)
├── README.md
├── .env.example                       ← committed, no secrets
├── .env.local                         ← NOT committed
├── .gitignore
├── vercel.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── app/
    │   ├── layout.tsx                 ← Inter font, html/body wrapper
    │   ├── page.tsx                   ← redirect → /dashboard or /login
    │   ├── globals.css                → import from src/styles/globals.css
    │   ├── login/
    │   │   └── page.tsx               ← login form (public)
    │   ├── dashboard/
    │   │   ├── layout.tsx             ← DashboardLayout (Sidebar + TopBar)
    │   │   └── page.tsx               ← main dashboard page (protected)
    │   └── api/
    │       └── auth/
    │           └── [...nextauth]/
    │               └── route.ts       ← NextAuth handler
    ├── auth.ts                        ← NextAuth config (credentials provider)
    ├── middleware.ts                  ← protect /dashboard routes
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   ├── TopBar.tsx
    │   │   └── DashboardLayout.tsx
    │   ├── overview/
    │   │   ├── HeadlineCards.tsx
    │   │   ├── RevenuePipeline.tsx
    │   │   └── PriorityTable.tsx
    │   ├── kpis/
    │   │   ├── KPISection.tsx         ← wrapper with header (badge, title, tariff, rag)
    │   │   ├── KPISmallCard.tsx       ← gauge + pct + badge (CRM03–06, CRM08–09)
    │   │   ├── KPIWideCard.tsx        ← large gauge + stat grid (CRM02, CRM07)
    │   │   ├── KPIHBarRow.tsx         ← horizontal bar row (CRM01 sub-KPIs)
    │   │   └── GaugeSVG.tsx           ← semicircle gauge SVG component
    │   ├── financials/
    │   │   ├── GroupTariffCards.tsx
    │   │   └── RevenueDonutChart.tsx
    │   ├── practices/
    │   │   └── PracticeCard.tsx
    │   └── ui/
    │       ├── Badge.tsx              ← semantic badge (success/destructive/warning/info)
    │       ├── StatsCard.tsx          ← headline metric card
    │       ├── UploadBanner.tsx       ← left-accent info banner
    │       ├── Button.tsx             ← gradient primary button
    │       └── CSVUploadButton.tsx    ← file input + papaparse trigger
    ├── lib/
    │   ├── types.ts                   ← all TypeScript interfaces
    │   ├── constants.ts               ← KPI_CONFIG, TARIFFS, PCN_PRACTICES
    │   ├── csv-parser.ts              ← EMIS CSV parsing logic
    │   ├── kpi-engine.ts              ← RAG, pace, revenue calculations
    │   └── utils.ts                  ← fmt(), cn(), formatDate()
    ├── hooks/
    │   └── useDashboardStore.ts       ← Zustand store with localStorage persist
    └── styles/
        └── globals.css                ← design tokens (see Section 4.1)

6. DATA MODEL
6.1 TypeScript Types (src/lib/types.ts)
tsexport type KPIType = 'C' | 'S'  // Cumulative vs Static
export type RAGStatus = 'green' | 'amber' | 'red'
export type PaymentBand = 'full' | 'half' | 'none'
export type RevenueBucket = 'secured' | 'onTarget' | 'atRisk'

export interface KPIConfig {
  code: string           // e.g. 'CRM01A'
  label: string          // e.g. 'AF Coding'
  short: string          // e.g. 'AF'
  t100: number           // 100% payment threshold (%)
  t50: number            // 50% payment threshold (%)
  weight: number         // % of total contract value (weights sum to 100)
  type: KPIType
  group: string          // e.g. '01', '02', '0306', '07', '0809'
}

export interface KPIDataRow {
  numerator: number
  denominator: number
  prevNumerator: number | null    // from previous week's upload
  prevDenominator: number | null
}

export interface KPIResult extends KPIConfig, KPIDataRow {
  current: number              // cur% = num/den * 100
  revenue: number              // £ allocated to this KPI (weight% of totalRev)
  paymentBand: PaymentBand
  ragStatus: RAGStatus
  revenueBucket: RevenueBucket
  patientsNeeded: number       // to reach 100% threshold
  weeklyRunRate: number | null  // patients/week needed (cumulative KPIs only)
  expectedAtPace: number | null // expected% at this point in year (cumulative)
  delta: number | null          // pp change vs previous week
  isSmallRegister: boolean      // den < 20 — pace% unreliable
}

export interface GroupSplit {
  group1: number   // High risk patients (£107.08/yr)
  group2: number   // Moderate risk patients (£53.13/yr)
  group3: number   // Lower risk patients (£24.09/yr)  — derived or uploaded
}

export interface CSVUpload {
  practiceCode: string
  practiceName: string
  uploadDate: string           // ISO 8601
  weekNumber: number           // 1–52
  populationCount: number
  rawRows: Record<string, number>   // code → count (all parsed rows)
  groupSplit: GroupSplit
  lastRunTimestamp: string
}

export interface DashboardState {
  currentUpload: CSVUpload | null
  previousUpload: CSVUpload | null     // for week-on-week delta
  uploadHistory: CSVUpload[]           // all uploads, newest first
  kpiResults: KPIResult[]
  totalRevenue: number
  securedRevenue: number
  onTargetRevenue: number
  atRiskRevenue: number
  groupSplitOverride: GroupSplit | null  // manual override if not in CSV
}
6.2 Constants (src/lib/constants.ts)
tsimport type { KPIConfig } from './types'

export const TARIFFS = {
  group1: 107.08,
  group2: 53.13,
  group3: 24.09,
} as const

export const CONTRACT_WEEKS = 52

// 13 KPIs — weights must sum to 100
export const KPI_CONFIG: KPIConfig[] = [
  { code: 'CRM01A', label: 'AF Coding',            short: 'AF',        t100: 54.4, t50: 50.3, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM01B', label: 'CKD Coding',           short: 'CKD',       t100: 82.2, t50: 80.3, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM01C', label: 'Diabetes Coding',      short: 'DM',        t100: 52.5, t50: 45.3, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM01D', label: 'HTN Coding',           short: 'HTN',       t100: 74.8, t50: 72.7, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM01E', label: 'NDH Coding',           short: 'NDH',       t100: 41.0, t50: 41.0, weight: 4,  type: 'C', group: '01' },
  { code: 'CRM02',  label: 'Care Processes',       short: 'Processes', t100: 50.0, t50: 30.0, weight: 20, type: 'C', group: '02' },
  { code: 'CRM03',  label: 'BP ≤130/80',           short: 'BP',        t100: 49.8, t50: 48.5, weight: 5,  type: 'S', group: '0306' },
  { code: 'CRM04',  label: 'Statin Prescribing',   short: 'Statins',   t100: 57.9, t50: 56.8, weight: 5,  type: 'S', group: '0306' },
  { code: 'CRM05',  label: 'ACEI/ARB',             short: 'ACEI/ARB',  t100: 66.1, t50: 65.6, weight: 5,  type: 'S', group: '0306' },
  { code: 'CRM06',  label: 'SGLT-2 Inhibitor',     short: 'SGLT-2',    t100: 42.5, t50: 38.8, weight: 5,  type: 'S', group: '0306' },
  { code: 'CRM07',  label: 'Holistic Care Plan',   short: 'Care Plan', t100: 50.0, t50: 30.0, weight: 30, type: 'C', group: '07' },
  // CRM08 has three sub-KPIs, each with its own denominator from the CSV
  { code: 'CRM08A', label: 'Physical Activity Impr.', short: 'Activity', t100: 2.5, t50: 2.0, weight: 0, type: 'C', group: '0809' },
  { code: 'CRM08B', label: 'BMI Improvement',          short: 'BMI',      t100: 2.5, t50: 2.0, weight: 0, type: 'C', group: '0809' },
  { code: 'CRM08C', label: 'Smoking Cessation',        short: 'Smoking',  t100: 2.5, t50: 2.0, weight: 5, type: 'C', group: '0809' },
  // ^ weight=5 assigned to CRM08C as the primary; A and B are sub-displays (weight=0 means revenue from section total)
  // NOTE: For revenue allocation, use the combined CRM08 section weight of 5% allocated to whichever sub-KPI is worst
  { code: 'CRM09',  label: 'Health Confidence',        short: 'HCS',      t100: 50.0, t50: 30.0, weight: 5, type: 'C', group: '0809' },
]

// KPI weights must sum to 100 — assert this at startup
const totalWeight = KPI_CONFIG.reduce((s, k) => s + k.weight, 0)
if (totalWeight !== 100) throw new Error(`KPI weights sum to ${totalWeight}, expected 100`)

export const PCN_PRACTICES = [
  { name: 'Premier Medical Centre',    ods: 'E84003' },
  { name: 'Alperton Medical Centre',   ods: 'E84638' },
  { name: 'GP Pathfinder Clinics',     ods: 'E84066' },
  { name: 'Lancelot Medical Centre',   ods: 'E84063' },
  { name: 'Stanley Corner Medical Centre', ods: null },
  { name: 'Sudbury & Alperton MC',     ods: null },
  { name: 'The Wembley Practice',      ods: 'Y02692' },
]

// Denominator code suffixes (strip to get KPI code)
// CRM01AD → CRM01A, CRM02D → CRM02, CRM06N → CRM06 (numerator special case)
export const DENOMINATOR_SUFFIX = 'D'
export const CRM06_NUMERATOR_CODE = 'CRM06N'

7. CSV PARSING (src/lib/csv-parser.ts)
7.1 EMIS CSV Format
The EMIS clinical system exports a CSV with this structure:
"Local Enhanced Services 2026-27","",""
"Last Run","17/04/2026 17:03",""
"Population","15986",""
"Male","7823",""
"Female","8163",""
"Search","",""
"*CRM01AD | CRM01A Denominator - AF","1591"
"CRM01A | AF patients on register with correct Read code","59"
"*CRM01BD | CRM01B Denominator - CKD","9"
...
Key parsing rules:

Strip leading * from codes before matching.
The code is everything before | on the left side of the first column.
Denominator codes end in D (e.g. CRM01AD, CRM02D). Strip the trailing D and the sub-KPI letter to get the base code — CRM01AD → numerator code is CRM01A.
CRM06 numerator is CRM06N, NOT CRM06. Map CRM06N → CRM06.
CRM08 has three sub-KPIs (A/B/C) — treat CRM08 as the primary (use CRM08A num / CRM08D den for the main KPI card; also show A/B/C breakdown).
Ignore any row whose code doesn't match a known KPI or denominator code.

7.2 Group 1/2/3 Section
The Group 1/2/3 patient counts appear at the bottom of the CSV. The parser must detect them using flexible regex (case-insensitive, trims whitespace):
ts// Patterns to try (in order):
const GROUP_PATTERNS = {
  group1: [/group\s*1/i, /high\s*risk/i, /g1\b/i],
  group2: [/group\s*2/i, /moderate\s*risk/i, /g2\b/i],
  group3: [/group\s*3/i, /lower\s*risk/i, /standard\s*risk/i, /g3\b/i],
}
If any group count is NOT found in the CSV, the parser must return null for that group count, and the UI must show manual input fields for the missing values before the dashboard renders. Do not guess or default — always show the input fields if data is missing.
7.3 Parser Function Signature
tsexport interface ParseResult {
  success: boolean
  error?: string
  data?: {
    lastRunTimestamp: string
    populationCount: number
    kpiRows: Record<string, { numerator: number; denominator: number }>
    // keys are KPI codes (CRM01A, CRM01B, ..., CRM09)
    groupSplit: {
      group1: number | null
      group2: number | null
      group3: number | null  // if null, derive as: CRM register size - group1 - group2
    }
    weekNumber: number       // derived: Math.ceil(weeksSinceContractStart)
    // CONTRACT_START = '2026-04-01' (financial year start)
  }
}

export function parseEMISCSV(csvText: string): ParseResult
7.4 Week Number Calculation
tsimport { differenceInDays, parseISO } from 'date-fns'

const CONTRACT_START = '2026-04-01'

export function calculateWeekNumber(uploadDateISO: string): number {
  const days = differenceInDays(parseISO(uploadDateISO), parseISO(CONTRACT_START))
  return Math.max(1, Math.ceil(days / 7))
}
7.5 CRM Register Size
The total CRM register (denominator for Group-level KPIs like CRM02, CRM07, CRM08, CRM09) is the CRM02D denominator value. Use this to derive Group 3 if not in CSV:
ts// Group 3 = CRM register - Group 1 - Group 2
const crmRegister = kpiRows['CRM02']?.denominator ?? 0
const group3 = crmRegister - (groupSplit.group1 ?? 0) - (groupSplit.group2 ?? 0)

8. KPI ENGINE (src/lib/kpi-engine.ts)
This is the core business logic. All calculations must match the following specification exactly.
8.1 Total Revenue
tsexport function calculateTotalRevenue(groups: GroupSplit): number {
  return (
    groups.group1 * TARIFFS.group1 +
    groups.group2 * TARIFFS.group2 +
    groups.group3 * TARIFFS.group3
  )
}
// Premier spot-check: 495 * 107.08 + 357 * 53.13 + 2454 * 24.09 = £131,089 (±£1 rounding)
8.2 KPI Revenue Allocation
tskpi.revenue = totalRevenue * (kpi.weight / 100)
8.3 Current Percentage
tskpi.current = kpi.denominator > 0 ? (kpi.numerator / kpi.denominator) * 100 : 0
8.4 Payment Band
tskpi.paymentBand =
  kpi.current >= kpi.t100 ? 'full' :
  kpi.current >= kpi.t50  ? 'half' :
  'none'
8.5 RAG Status
Cumulative KPIs (type = 'C'):
tsconst weeksSinceStart = currentUpload.weekNumber   // weeks elapsed in year
const expectedAtPace = kpi.t100 * (weeksSinceStart / CONTRACT_WEEKS)
const pace = expectedAtPace > 0 ? kpi.current / expectedAtPace : 0

// Small register guard: if den < 20, pace % is not meaningful
const expectedPatients = (expectedAtPace / 100) * kpi.denominator
const gapPatients = expectedPatients - kpi.numerator
const nearlyThere = gapPatients < 1

kpi.ragStatus = (pace >= 0.9 || nearlyThere) ? 'green'
              : pace >= 0.5 ? 'amber'
              : 'red'
kpi.isSmallRegister = kpi.denominator < 20
kpi.expectedAtPace = expectedAtPace
Static KPIs (type = 'S', i.e. CRM03–06):
tskpi.ragStatus = kpi.current >= kpi.t100 ? 'green'
              : kpi.current >= kpi.t50  ? 'amber'
              : 'red'
kpi.expectedAtPace = null
kpi.isSmallRegister = false
8.6 Revenue Bucket
tskpi.revenueBucket =
  kpi.paymentBand === 'full' ? 'secured' :
  (kpi.ragStatus === 'green' || kpi.paymentBand === 'half') ? 'onTarget' :
  'atRisk'
8.7 Patients Needed (to reach 100% threshold)
tskpi.patientsNeeded = Math.max(
  0,
  Math.ceil((kpi.denominator * kpi.t100) / 100) - kpi.numerator
)
8.8 Weekly Run Rate (cumulative KPIs only)
tsconst weeksRemaining = CONTRACT_WEEKS - (currentUpload.weekNumber ?? 0)
kpi.weeklyRunRate =
  kpi.patientsNeeded > 0 && weeksRemaining > 0
    ? Math.ceil(kpi.patientsNeeded / weeksRemaining)
    : 0
8.9 Week-on-Week Delta
tskpi.delta =
  previousUpload &&
  previousUpload.kpiRows[kpi.code]?.denominator > 0
    ? kpi.current -
      (previousUpload.kpiRows[kpi.code].numerator /
       previousUpload.kpiRows[kpi.code].denominator) * 100
    : null

9. AUTHENTICATION (src/auth.ts)
Use NextAuth v5 with the Credentials provider. Credentials are stored in environment variables — one set per practice for the MVP.
tsimport NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validUsername = process.env.DASHBOARD_USERNAME
        const validPassword = process.env.DASHBOARD_PASSWORD
        if (
          credentials?.username === validUsername &&
          credentials?.password === validPassword
        ) {
          return {
            id: '1',
            name: process.env.PRACTICE_NAME ?? 'Practice',
            email: process.env.DASHBOARD_USERNAME,
          }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
9.1 Middleware (src/middleware.ts)
tsexport { auth as middleware } from '@/auth'

export const config = {
  matcher: ['/dashboard/:path*'],
}
9.2 Environment Variables
.env.example (commit this):
NEXTAUTH_SECRET=                # generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000   # set to Vercel URL in production

DASHBOARD_USERNAME=             # e.g. premier
DASHBOARD_PASSWORD=             # choose a strong password
PRACTICE_NAME=                  # e.g. "Premier Medical Centre"
PRACTICE_ODS=                   # e.g. E84003
.env.local (do NOT commit — add to .gitignore):
NEXTAUTH_SECRET=<generated>
NEXTAUTH_URL=http://localhost:3000
DASHBOARD_USERNAME=premier
DASHBOARD_PASSWORD=<chosen>
PRACTICE_NAME=Premier Medical Centre
PRACTICE_ODS=E84003

10. COMPONENT SPECIFICATIONS
10.1 Login Page (src/app/login/page.tsx)

Centred card, max-w-md, brand gradient header strip
GPA logo (SVG inline) above the form
username and password inputs with visible labels
"Sign in" button: bg-brand-gradient text-white rounded-lg
On error: show an inline error alert (destructive variant)
Redirect to /dashboard on success

10.2 Dashboard Layout (src/components/layout/DashboardLayout.tsx)
┌─────────────────────────────────────────────────────┐
│ SIDEBAR (240px, sticky, full height, sidebar-gradient)│
│ ├─ Logo area: GPA logo + practice name + PCN         │
│ ├─ Nav section: Overview / KPI Performance / etc.    │
│ ├─ Nav section: Detection (CRM01) → per sub-KPI      │
│ ├─ Nav section: Processes & Outcomes                 │
│ ├─ Nav section: Care Planning                        │
│ └─ Bottom: last upload date                          │
├─────────────────────────────────────────────────────┤
│ TOPBAR (64px, sticky, shadow-sm)                     │
│ ├─ Tabs: Overview | KPI Performance | Financials | PCN│
│ └─ Right: date badge + Upload CSV button (gradient)  │
├─────────────────────────────────────────────────────┤
│ CONTENT (flex-1, p-6, background)                    │
│   [active tab panel]                                 │
└─────────────────────────────────────────────────────┘
Active tab state is managed with useState in the layout client component. Sidebar nav links trigger tab switches AND scroll to section anchors within the KPI tab.
10.3 StatsCard (src/components/ui/StatsCard.tsx)
Props: { label: string; value: string; sub?: string; badge?: ReactNode; accentColor: 'gradient' | 'green' | 'red' | 'blue' }

rounded-xl shadow-md bg-card border border-border p-[18px]
3px top accent stripe matching accentColor
Label: text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground
Value: text-2xl font-extrabold text-foreground

10.4 GaugeSVG (src/components/kpis/GaugeSVG.tsx)
Props: { current: number; target: number; color: string; size: 'sm' | 'md' | 'lg' }
Render a semicircle (180°) gauge:

Background arc: stroke="hsl(var(--muted))"
Filled arc: stroke={color}, length proportional to current/100
Target tick: dashed vertical line at the target% position on the arc
Sizes: sm (r=17, sw=4), md (r=28, sw=6.5), lg (r=38, sw=9)
No animation on server render — use CSS transition on client

10.5 CSVUploadButton (src/components/ui/CSVUploadButton.tsx)
Props: { onUpload: (result: ParseResult) => void; disabled?: boolean }

Hidden <input type="file" accept=".csv"> triggered by a styled button
On file select: read as text → call parseEMISCSV() → call onUpload(result)
Show <Loader2 className="animate-spin"> while parsing
If result.data.groupSplit has nulls, open a modal/dialog for manual G1/G2 entry before completing upload
On success: show toast notification "Upload successful — [date] · [n] KPI rows parsed"

10.6 RevenueDonutChart (src/components/financials/RevenueDonutChart.tsx)
Use Recharts PieChart (not Chart.js):
tsximport { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Secured',      value: securedRevenue,  color: '#22c55e' },
  { name: 'On Target',    value: onTargetRevenue,  color: '#0059c7' },
  { name: 'Needs Action', value: atRiskRevenue,    color: '#ef4444' },
]

innerRadius={60} (donut)
Tooltip: white/95 bg, 8px radius, Inter font
Legend: bottom, 11px Inter


11. ZUSTAND STORE (src/hooks/useDashboardStore.ts)
tsimport { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CSVUpload, DashboardState, GroupSplit } from '@/lib/types'
import { computeKPIResults } from '@/lib/kpi-engine'

interface DashboardStore extends DashboardState {
  addUpload: (upload: CSVUpload) => void
  clearHistory: () => void
  setGroupSplitOverride: (split: GroupSplit) => void
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      currentUpload: null,
      previousUpload: null,
      uploadHistory: [],
      kpiResults: [],
      totalRevenue: 0,
      securedRevenue: 0,
      onTargetRevenue: 0,
      atRiskRevenue: 0,
      groupSplitOverride: null,

      addUpload: (upload) => {
        const { currentUpload, uploadHistory, groupSplitOverride } = get()
        const newHistory = [upload, ...uploadHistory].slice(0, 52) // keep 1 year

        // Use override if present, else use CSV data
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

      clearHistory: () =>
        set({
          currentUpload: null,
          previousUpload: null,
          uploadHistory: [],
          kpiResults: [],
          totalRevenue: 0,
          securedRevenue: 0,
          onTargetRevenue: 0,
          atRiskRevenue: 0,
        }),

      setGroupSplitOverride: (split) => {
        set({ groupSplitOverride: split })
        // Recompute with new split if upload exists
        const { currentUpload, previousUpload } = get()
        if (currentUpload) {
          const { results, totalRev, securedRev, onTargetRev, atRiskRev } =
            computeKPIResults(currentUpload, previousUpload, split)
          set({ kpiResults: results, totalRevenue: totalRev, securedRevenue: securedRev, onTargetRevenue: onTargetRev, atRiskRevenue: atRiskRev })
        }
      },
    }),
    { name: 'nwl-crm-dashboard-v1' }
  )
)

12. OVERVIEW TAB
12.1 Empty State (no CSV uploaded)
When currentUpload is null, show a centred card:

Icon: <Upload className="h-12 w-12 text-muted-foreground">
Heading: "Upload your EMIS export to get started"
Body: "Export your Local Enhanced Services CSV from EMIS Web, then click the Upload CSV button in the top right."
Button: <CSVUploadButton> (gradient, lg)

12.2 Loaded State

Upload banner (left-accent): last upload date · rows parsed · next due date
Headline stats (5 cards, 5-col grid): Max Annual Revenue · Secured · On Target · At Risk · KPI Status
Revenue pipeline (stacked bar): Secured / On Target / At Risk proportions
Priority table: all 13 KPIs sorted by urgency bucket first, then £ at stake

Priority table columns: KPI Code | Description | Current % | Δ Week | Target | Status | Patients needed | £ at stake
Bucket order in table: Needs Action → On Target → Secured (with a header row between each bucket)

13. NAVIGATION & TAB ROUTING
Use useState<'overview' | 'kpis' | 'financials' | 'practices'> in the layout. Sidebar links call setActiveTab() and optionally scrollToSection(id) using element.scrollIntoView({ behavior: 'smooth', block: 'start' }).
Flash animation on scrolled-to section: 1.1s navFlash keyframe (see dashboard-v3.html in the project reference files).

14. VERCEL DEPLOYMENT CONFIG
14.1 vercel.json
json{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install"
}
14.2 Deployment Steps (for Arun to follow after build)

cd ~/Projects/Ghengis-khan && git add projects/nwl-crm-dashboard && git commit -m "feat: NWL CRM dashboard build"
git push origin main
→ Lives at: https://github.com/Arun-29-code/Ghengis-khan/tree/main/projects/nwl-crm-dashboard
Go to vercel.com → "Add New Project" → import the GitHub repo
Add environment variables (from .env.example) in Vercel dashboard
Deploy — Vercel auto-detects Next.js


15. ACCEPTANCE TESTS
After building, verify all of the following manually (no automated test framework needed — use the browser console and the fixture data below):
Fixture Data (Premier Medical Centre — 17 Apr 2026 upload)
Group 1: 495 patients  | Group 2: 357 patients | Group 3: 2,454 patients
Week number: 2 (days since 2026-04-01 = 16 days → week 3 — NOTE: use 2.43 weeks elapsed)

KPI spot-checks:
  CRM01A: num=59, den=1591 → current=3.71% → BELOW t50 (50.3%) → payBand=none → rag=red → ptsNeed=808
  CRM02:  num=9, den=3306  → current=0.27% → payBand=none → rag=red → ptsNeed=1644
  CRM03:  num=1030,den=2129 → current=48.38% → BELOW t100 (49.8%) → payBand=half → rag=amber
  CRM05:  num=383,den=557   → current=68.76% → ABOVE t100 (66.1%) → payBand=full → rag=green
  CRM07:  num=0, den=852    → current=0%  → payBand=none → rag=red → weeklyRunRate=9 pts/wk → ptsNeed=426
  CRM08:  num=13, den=852   → current=1.53% → BELOW t50 (2.0%) → payBand=none → rag=red

Revenue spot-checks:
  totalRevenue = 495×107.08 + 357×53.13 + 2454×24.09 = £131,088.54 (display as £131,089)
  CRM07 revenue = £131,089 × 0.30 = £39,327
  CRM02 revenue = £131,089 × 0.20 = £26,218
Tests to Pass

 Login page: wrong password shows error, correct password redirects to /dashboard
 Empty state shows upload prompt when no CSV loaded
 Upload a CSV → all 13 KPI rows parse correctly (check console for parseEMISCSV output)
 CRM07 shows 0.0% and "9 care plans/week" run rate
 CRM05 shows "Payment Secured" badge (above 100% threshold)
 Total revenue displays as £131,089
 Revenue pipeline bar sums to 100%
 Uploading a second CSV populates the Δ Week column
 Sidebar navigation scrolls to the correct KPI section
 Refreshing the page retains all uploaded data (localStorage persistence)
 Visiting /dashboard without logging in redirects to /login


16. CLAUDE.md (write this file FIRST, in the repo root)
markdown# NWL CRM Dashboard — Agent Orientation

This file exists so any AI agent (Claude Code or otherwise) can understand the
codebase without additional context from the original developer.

## What this app does
Analytics dashboard for NHS NWL CRM Local Enhanced Service 2026-27.
GPs upload their EMIS clinical system CSV export weekly; the dashboard
tracks KPI achievement against annual targets and estimates revenue at risk.

## Key business rules
1. 13 KPIs, each weighted % of total contract value (weights sum to 100).
2. Cumulative KPIs (type='C'): RAG = pace-based (current% / expectedAtPace%).
   Static KPIs (type='S', CRM03-06): RAG = threshold-based (current% vs t100/t50).
3. If gap between expected and actual patients < 1 person, treat as on-track (rounding).
4. Small registers (den < 20): pace % unreliable — show caveat, don't use for RAG.
5. Group 3 patients = CRM register size (CRM02 denominator) - Group1 - Group2.
6. Revenue bucket: full payment → 'secured'; on-track or half-pay → 'onTarget'; else → 'atRisk'.

## Critical file locations
- Business logic:   src/lib/kpi-engine.ts
- CSV parsing:      src/lib/csv-parser.ts
- All KPI config:   src/lib/constants.ts (KPI_CONFIG, TARIFFS)
- State:            src/hooks/useDashboardStore.ts (Zustand + localStorage)
- Auth:             src/auth.ts + src/middleware.ts

## Known edge cases
- CRM06 numerator in CSV is coded 'CRM06N', not 'CRM06'. Parser maps it.
- CRM08 has A/B/C sub-KPIs. Primary KPI card uses CRM08A/CRM08D only.
- CRM01B and CRM01E have very small registers (den=9, den=29) — flag these.
- If Group 1/2/3 not found in CSV, UI shows manual input modal before dashboard renders.

## Acceptance test fixture
Premier Medical Centre · 17 Apr 2026 · G1=495 · G2=357 · G3=2454
Expected total revenue: £131,089. CRM07 should show 0% and 9 care plans/week.

## DO NOT
- Do not add features outside Section 1 scope without asking.
- Do not hard-code hex values — always use CSS custom properties or Tailwind tokens.
- Do not use Chart.js — use Recharts only.
- Do not add patient-level data handling (regulatory risk).

17. KNOWN GAPS / TODOs (do not build these now)
The following items are documented here so a future agent can pick them up:
ItemNotesG1/G2/G3 CSV formatExact row labels TBC — parser uses flexible regex + manual fallback. Update GROUP_PATTERNS in csv-parser.ts once confirmed.CRM08 A/B/C sub-KPI breakdownParse all three (CRM08A/B/C) but show combined CRM08 card. Sub-breakdown view is deferred.Multi-practice / PCN aggregationStructure supports multiple uploads (one per practice) but PCN-level aggregation UI is Phase 2.Narrow-the-gap panelPer-PCN Appendix XII thresholds (see project EMIS spec). Deferred to Phase 2.What-if slidersFinancial modelling with adjustable G1/G2 patient counts. Phase 2.Email/multi-user authCurrently single username/password from env. Phase 2: add a simple user table.Vercel KV data persistenceCurrently LocalStorage — move to Vercel KV for cross-device access. Phase 2
