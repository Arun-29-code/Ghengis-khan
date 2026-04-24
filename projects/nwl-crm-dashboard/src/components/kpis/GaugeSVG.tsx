import { cn } from '@/lib/utils'

export type GaugeSize = 'sm' | 'md' | 'lg'

interface GaugeSVGProps {
  current: number // 0–100
  target: number // 0–100 (payment threshold tick)
  color: string // CSS colour for the filled arc
  size?: GaugeSize
  className?: string
}

const DIMS: Record<GaugeSize, { r: number; sw: number }> = {
  sm: { r: 17, sw: 4 },
  md: { r: 28, sw: 6.5 },
  lg: { r: 38, sw: 9 },
}

export function GaugeSVG({
  current,
  target,
  color,
  size = 'md',
  className,
}: GaugeSVGProps) {
  const { r, sw } = DIMS[size]
  const pad = sw / 2 + 2
  const w = r * 2 + pad * 2
  const h = r + pad * 2
  const cx = w / 2
  const cy = r + pad

  const arcLen = Math.PI * r
  const clamped = Math.max(0, Math.min(100, current))
  const filledLen = (clamped / 100) * arcLen

  // 0% at the left (angle π), 100% at the right (angle 0).
  const targetClamped = Math.max(0, Math.min(100, target))
  const targetAngle = Math.PI - (targetClamped / 100) * Math.PI
  const tickInner = r - sw / 2 - 2
  const tickOuter = r + sw / 2 + 2

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-hidden
      className={cn('text-muted', className)}
    >
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {/* Filled arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={arcLen}
        strokeDashoffset={arcLen - filledLen}
        style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
      />
      {/* Target tick (short dashed line crossing the arc at the threshold) */}
      <line
        x1={cx + tickInner * Math.cos(targetAngle)}
        y1={cy - tickInner * Math.sin(targetAngle)}
        x2={cx + tickOuter * Math.cos(targetAngle)}
        y2={cy - tickOuter * Math.sin(targetAngle)}
        stroke="var(--color-foreground)"
        strokeWidth={1.2}
        strokeDasharray="2 2"
        opacity={0.7}
      />
    </svg>
  )
}
