import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function DashboardPage() {
  const practiceName = process.env.PRACTICE_NAME ?? 'Practice'
  const practiceOds = process.env.PRACTICE_ODS ?? 'UNKNOWN'
  return (
    <DashboardLayout
      practiceName={practiceName}
      practiceOds={practiceOds}
      pcnName="K&W West PCN"
    />
  )
}
