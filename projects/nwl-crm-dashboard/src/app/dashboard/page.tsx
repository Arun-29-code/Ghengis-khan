import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function DashboardPage() {
  const practiceName = process.env.PRACTICE_NAME ?? 'Practice'
  return <DashboardLayout practiceName={practiceName} pcnName="K&W West PCN" />
}
