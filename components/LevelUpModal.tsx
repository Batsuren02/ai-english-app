'use client'

import { LEVEL_REWARDS, getLevelInfo } from '@/lib/xp-system'
import InteractiveButton from '@/components/design/InteractiveButton'
import { ChevronRight } from 'lucide-react'

interface LevelUpModalProps {
  isOpen: boolean
  oldLevel: number
  newLevel: number
  totalXp: number
  onClose: () => void
}

/**
 * Card modal that appears over the confetti animation when the user levels up.
 * Shows the level transition, new title, cosmetic reward message, and a Continue button.
 * z-index 60 so it sits above the confetti overlay (z-50).
 */
export default function LevelUpModal({ isOpen, oldLevel, newLevel, totalXp, onClose }: LevelUpModalProps) {
  if (!isOpen) return null

  const reward = LEVEL_REWARDS[newLevel] ?? LEVEL_REWARDS[6]
  const { xpToNext } = getLevelInfo(totalXp)

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      {/* Card — stop click propagation so tapping card doesn't close */}
      <div
        className="scale-in w-full max-w-sm rounded-2xl p-7 shadow-2xl text-center space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <p className="text-2xl mb-1">✨</p>
          <h2 className="h3 text-[var(--accent)] font-extrabold tracking-tight">Level Up!</h2>
        </div>

        {/* Level transition arrow */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">From</span>
            <span
              className="text-4xl font-black"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}
            >
              {oldLevel}
            </span>
          </div>
          <ChevronRight size={28} className="text-[var(--accent)] mt-4 shrink-0" />
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">To</span>
            <span
              className="text-5xl font-black text-[var(--accent)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {newLevel}
            </span>
          </div>
        </div>

        {/* New title */}
        <div
          className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl"
          style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
        >
          <span className="text-3xl">{reward.icon}</span>
          <span className="text-xl font-bold text-[var(--text)]">{reward.title}</span>
        </div>

        {/* Reward section */}
        <div className="space-y-1.5 text-left">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">🎁 Rank Unlocked</p>
          <p className="body text-[var(--text)] leading-snug">"{reward.message}"</p>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-[12px] text-[var(--text-secondary)] border-t border-[var(--border)] pt-4">
          <span>Total XP: <strong className="text-[var(--text)]">{totalXp.toLocaleString()}</strong></span>
          <span>Next level: <strong className="text-[var(--text)]">{xpToNext.toLocaleString()} XP</strong></span>
        </div>

        {/* Continue button */}
        <InteractiveButton
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onClose}
        >
          Continue
          <ChevronRight size={16} className="inline ml-1" />
        </InteractiveButton>
      </div>
    </div>
  )
}
