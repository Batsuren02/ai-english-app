'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Achievement } from '@/lib/achievements'

interface AchievementBadgeProps {
  achievement: Achievement
  unlocked: boolean
  className?: string
}

/**
 * AchievementBadge — shows one badge, locked or unlocked.
 */
export function AchievementBadge({ achievement, unlocked, className }: AchievementBadgeProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200',
        unlocked
          ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5 scale-in'
          : 'border-[var(--border)] bg-[var(--bg)] opacity-40',
        className
      )}
      title={`${achievement.label}: ${achievement.desc}`}
    >
      <div className="text-2xl leading-none" style={{ filter: unlocked ? 'none' : 'grayscale(1)' }}>
        {achievement.icon}
      </div>
      <p className="text-[10px] font-semibold text-[var(--text)] text-center leading-tight">{achievement.label}</p>
      <p className="text-[9px] text-[var(--text-secondary)] text-center leading-tight">{achievement.desc}</p>
    </div>
  )
}

export default AchievementBadge
