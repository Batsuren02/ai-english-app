'use client'

import InteractiveButton from '@/components/design/InteractiveButton'
import { showXPPopup } from '@/components/XPPopup'
import { Flame, Zap } from 'lucide-react'

interface DailyBonusModalProps {
  isOpen: boolean
  xpAwarded: number
  streakDays: number
  label: string
  onClose: () => void
}

/**
 * Modal shown once per day when the user first opens the dashboard.
 * Displays their daily bonus XP and current streak.
 * z-index 60 — sits above any other overlays.
 */
export default function DailyBonusModal({ isOpen, xpAwarded, streakDays, label, onClose }: DailyBonusModalProps) {
  if (!isOpen) return null

  function handleClaim() {
    showXPPopup(xpAwarded)
    onClose()
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={handleClaim}
    >
      {/* Card — stop click propagation so tapping card doesn't close */}
      <div
        className="scale-in w-full max-w-sm rounded-2xl p-7 shadow-2xl text-center space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <p className="text-2xl mb-1">🌅</p>
          <h2 className="h3 text-[var(--accent)] font-extrabold tracking-tight">Daily Bonus!</h2>
        </div>

        {/* XP award */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Zap size={28} className="text-[var(--accent)]" />
            <span
              className="text-5xl font-black text-[var(--accent)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              +{xpAwarded}
            </span>
            <span className="text-xl font-bold text-[var(--text-secondary)] mt-1">XP</span>
          </div>
        </div>

        {/* Streak badge */}
        {streakDays > 0 && (
          <div
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
          >
            <Flame size={20} className="text-amber-500" />
            <span className="text-lg font-bold text-[var(--text)]">
              {streakDays}-day streak
            </span>
          </div>
        )}

        {/* Motivational label */}
        <p className="body text-[var(--text-secondary)] leading-snug">&ldquo;{label}&rdquo;</p>

        {/* Claim button */}
        <InteractiveButton
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleClaim}
        >
          Claim! 🎁
        </InteractiveButton>
      </div>
    </div>
  )
}
