'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon?: React.ReactNode
  label: string
  value: string | number
  color?: string
  className?: string
}

/**
 * StatCard - Dashboard stat display component
 * Shows a single stat with icon, label, and value
 */
export function StatCard({
  icon,
  label,
  value,
  color = 'var(--accent)',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'card surface-hover text-center p-5 rounded-lg border border-[var(--border)]',
        className
      )}
    >
      {icon && (
        <div style={{ color, marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
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
        }}
      >
        {value}
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

export default StatCard
