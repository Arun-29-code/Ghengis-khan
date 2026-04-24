'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { REVENUE_COLORS } from '@/lib/constants'
import { fmt } from '@/lib/utils'

interface RevenueDonutChartProps {
  securedRevenue: number
  onTargetRevenue: number
  atRiskRevenue: number
  totalRevenue: number
}

export function RevenueDonutChart({
  securedRevenue,
  onTargetRevenue,
  atRiskRevenue,
  totalRevenue,
}: RevenueDonutChartProps) {
  const data = [
    { name: 'Secured',      value: securedRevenue,  color: REVENUE_COLORS.secured  },
    { name: 'On Target',    value: onTargetRevenue, color: REVENUE_COLORS.onTarget },
    { name: 'Needs Action', value: atRiskRevenue,   color: REVENUE_COLORS.atRisk   },
  ].filter((d) => d.value > 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Revenue mix</h3>
          <p className="text-xs text-muted-foreground">
            How the annual ceiling splits across KPI status buckets
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {fmt(totalRevenue, { currency: true })}
        </span>
      </div>

      <div className="mt-2 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              stroke="var(--color-card)"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value ?? 0)
                return fmt(n, { currency: true })
              }}
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
                fontSize: 12,
              }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{
                fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
                fontSize: 11,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
