'use client'

import React from 'react'

interface GoalRingProps {
  done: number
  total: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
}

/**
 * GoalRing — SVG circular progress ring.
 * Shows done/total with animated fill.
 */
export function GoalRing({ done, total, size = 80, strokeWidth = 7, label, sublabel }: GoalRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? Math.min(done / total, 1) : 0
  const offset = circumference * (1 - progress)
  const pct = total > 0 ? Math.round(progress * 100) : 0

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={progress >= 1 ? 'var(--success)' : 'var(--accent)'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        {/* Center text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ fontSize: size < 70 ? 11 : 13 }}
        >
          <span className="font-bold text-[var(--text)] leading-none">
            {done}<span className="text-[var(--text-secondary)] font-normal">/{total}</span>
          </span>
          {pct === 100 && <span className="text-[9px] text-[var(--success)] font-semibold mt-0.5">Done!</span>}
        </div>
      </div>
      {label && <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">{label}</p>}
      {sublabel && <p className="text-[10px] text-[var(--text-secondary)]">{sublabel}</p>}
    </div>
  )
}

export default GoalRing
