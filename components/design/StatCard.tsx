'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  icon?: React.ReactNode
  label: string
  value: string | number
  color?: string
  className?: string
  trend?: { direction: 'up' | 'down'; percent: number }
  animated?: boolean
}

/**
 * StatCard - Dashboard stat display component
 * Shows a single stat with icon, label, and value
 */
function StatCardBase({
  icon,
  label,
  value,
  color = 'var(--accent)',
  className,
  trend,
  animated = false,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value)

  useEffect(() => {
    if (!animated || typeof value !== 'number') return

    let rafId: number
    let start: number | null = null
    const duration = 800
    const from = 0
    const to = value as number

    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const elapsed = timestamp - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out-cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(from + (to - from) * ease))
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      }
    }

    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [value, animated])

  const trendColor = trend?.direction === 'up' ? 'var(--success)' : 'var(--error)'
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown

  return (
    <div
      className={cn(
        'card surface-hover text-center p-5 rounded-lg border border-[var(--border)] scale-in',
        className
      )}
    >
      {icon && (
        <div style={{ color, marginBottom: '8px', display: 'flex', justifyContent: 'center' }} className="scale-in">
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color,
          marginBottom: 4,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {animated ? displayValue : value}
        {trend && (
          <div style={{ fontSize: 14, color: trendColor, display: 'flex', alignItems: 'center', gap: '2px' }}>
            <TrendIcon size={16} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{trend.percent}%</span>
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </div>
    </div>
  )
}

export const StatCard = React.memo(StatCardBase)

export default StatCard
