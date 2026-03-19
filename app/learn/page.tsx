'use client'

import React, { useEffect, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { CheckCircle, XCircle, RotateCcw, Award, Flame, ThumbsUp, ThumbsDown } from 'lucide-react'
import LearningCard from '@/components/learn/LearningCard'
import RatingButtons from '@/components/learn/RatingButtons'
import SurfaceCard from '@/components/design/SurfaceCard'
import StatCard from '@/components/design/StatCard'
import InteractiveButton from '@/components/design/InteractiveButton'
import EmptyState from '@/components/design/EmptyState'
import { TextPrimary, TextSecondary } from '@/components/design/Text'
import CelebrationBanner from '@/components/design/CelebrationBanner'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal'
import { useToastContext } from '@/components/ToastProvider'
import { useLearningSession } from '@/lib/hooks/useLearningSession'
import { awardXP, calculateReviewXP, getLevelInfo, getUserStreak } from '@/lib/xp-system'
import { incrementChallengeProgress } from '@/lib/challenge-tracker'
import dynamic from 'next/dynamic'
import { showXPPopup } from '@/components/XPPopup'
const LottiePlayer = dynamic(() => import('@/components/LottiePlayer'), { ssr: false })
const LevelUpModal = dynamic(() => import('@/components/LevelUpModal'), { ssr: false })

export default function LearnPage() {
  const toast = useToastContext()
  const session = useLearningSession(toast)

  // UI-only state (not part of session logic)
  const [showMongolianHint, setShowMongolianHint] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showSpaceHint, setShowSpaceHint] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpData, setLevelUpData] = useState<{ oldLevel: number; newLevel: number; totalXp: number } | null>(null)
  const [userStreak, setUserStreak] = useState(0)

  useEffect(() => {
    try { setShowMongolianHint(localStorage.getItem('showMongolianHint') === 'true') } catch {}
    const t = setTimeout(() => setShowSpaceHint(false), 3000)
    getUserStreak().then(setUserStreak).catch(err => console.error('[learn] getUserStreak:', err))
    return () => clearTimeout(t)
  }, [])

  // Award XP whenever a new result is added (i.e., a card was rated)
  useEffect(() => {
    const len = session.results.length
    if (len === 0) return
    const last = session.results[len - 1]
    if (last.correct) {
      const ease = (last.word as any).review?.ease_factor ?? 2.5
      const xp = calculateReviewXP(ease, userStreak)
      showXPPopup(xp)
      incrementChallengeProgress('flashcard_sprint').catch(err => console.error('[learn] challenge:', err))
    }
  }, [session.results.length])

  // Award session XP when session completes
  useEffect(() => {
    if (!session.sessionDone || session.results.length === 0) return
    const totalXP = session.results
      .filter(r => r.correct)
      .reduce((sum, r) => sum + calculateReviewXP((r.word as any).review?.ease_factor ?? 2.5, userStreak), 0)
    if (totalXP <= 0) return
    awardXP(totalXP).then(result => {
      if (result?.didLevelUp) {
        setShowConfetti(true)
        setShowLevelUp(true)
        setLevelUpData({ oldLevel: result.oldLevel, newLevel: result.newLevel, totalXp: result.totalXp })
        // Belt-and-suspenders fallback: clear after 8s if modal/animation callbacks don't fire
        setTimeout(() => { setShowConfetti(false); setShowLevelUp(false) }, 8000)
      } else {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 6000)
      }
    }).catch(err => console.error('[learn] awardXP:', err))
  }, [session.sessionDone])

  // Keyboard shortcuts: Space/Enter to flip, 1-4 to rate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); return }
      if (!session.dueWords[session.currentIdx] || session.sessionDone) return

      if (!session.showDetails) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault()
          session.setShowDetails(true)
        }
      } else {
        if (e.key === '1') { e.preventDefault(); session.rateWithQuality(0) }
        if (e.key === '2') { e.preventDefault(); session.rateWithQuality(2) }
        if (e.key === '3') { e.preventDefault(); session.rateWithQuality(3) }
        if (e.key === '4') { e.preventDefault(); session.rateWithQuality(5) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session.dueWords, session.currentIdx, session.showDetails, session.sessionDone, session.setShowDetails, session.rateWithQuality])

  const {
    dueWords,
    currentIdx,
    showDetails,
    results,
    sessionDone,
    loading,
    newCount,
    dueCount,
    nextReviewDate,
    dragX,
    undoVisible,
    undoWord,
    cardRef,
    current,
    rotation,
    cardOpacity,
    rightProgress,
    leftProgress,
    overlayColor,
    cardTransition,
    isDragging,
    handleCardDown,
    handleCardMove,
    handleCardUp,
    handleCardLeave,
    handleButtonRate,
    handleUndo,
    rateWithQuality,
    restartSession,
    setShowDetails,
  } = session

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <TextSecondary className="italic">Loading your review session...</TextSecondary>
    </div>
  )

  if (dueWords.length === 0) return (
    <EmptyState
      icon={<CheckCircle size={56} className="text-green-600" />}
      title="All caught up! 🎉"
      description={
        nextReviewDate
          ? `Your next review is in ${formatDistanceToNow(new Date(nextReviewDate))} — ${format(new Date(nextReviewDate), 'EEEE, MMM d')}`
          : "No words due for review today. You're doing great! Come back tomorrow."
      }
      animated={false}
    />
  )

  if (sessionDone) {
    const correct = results.filter(r => r.correct).length
    const accuracy = Math.round(correct / results.length * 100)
    return (
      <div className="fade-in-up max-w-2xl mx-auto space-y-6 relative">
        {showConfetti && (
          <LottiePlayer src="/animations/confetti.json" variant="cover" fallbackMs={5000} onComplete={() => setShowConfetti(false)} />
        )}
        {showLevelUp && (
          <LottiePlayer src="/animations/level-up.json" variant="cover" fallbackMs={5000} onComplete={() => setShowLevelUp(false)} />
        )}
        <LevelUpModal
          isOpen={!!levelUpData}
          oldLevel={levelUpData?.oldLevel ?? 1}
          newLevel={levelUpData?.newLevel ?? 2}
          totalXp={levelUpData?.totalXp ?? 0}
          onClose={() => { setLevelUpData(null); setShowLevelUp(false); setShowConfetti(false) }}
        />
        <CelebrationBanner active />
        <div className="text-center scale-in">
          <div className="flex justify-center mb-4 bounce-in">
            <Award size={64} className="text-[var(--accent)]" />
          </div>
          <h1 className="h2 text-[var(--text)] mb-2">Session Complete! 🎉</h1>
          <p className="body text-[var(--text-secondary)]">Great work on your review session.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Reviewed" value={results.length} color="var(--accent)" />
          <StatCard label="Correct" value={correct} color="var(--success)" trend={{ direction: 'up', percent: correct }} />
          <StatCard label="Accuracy" value={`${accuracy}%`} color="var(--accent)" />
        </div>

        <SurfaceCard padding="lg">
          <h3 className="h4 text-[var(--text)] mb-4">Review History</h3>
          <div className="space-y-2">
            {results.map(({ word, correct }, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex-shrink-0">
                  {correct
                    ? <CheckCircle size={18} className="text-[var(--success)]" />
                    : <XCircle size={18} className="text-[var(--error)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text)] text-sm">{word.word}</p>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{word.definition?.slice(0, 60)}</p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="text-center">
          <InteractiveButton
            variant="primary"
            size="lg"
            onClick={restartSession}
          >
            <RotateCcw size={16} className="inline mr-2" />
            Start New Session
          </InteractiveButton>
        </div>
      </div>
    )
  }

  if (!current) return null
  const progressPercent = (currentIdx / dueWords.length) * 100

  return (
    <div className="fade-in max-w-2xl mx-auto space-y-6">
      {/* Session Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h3 text-[var(--text)]">Learning Session</h1>
          <p className="body text-[var(--text-secondary)] text-sm mt-1">{dueCount} due • {newCount > 0 ? `${newCount} new` : 'No new words'}</p>
        </div>
        <div className="flex items-center gap-2 text-center">
          <Flame size={20} className="text-amber-600" />
          <div>
            <p className="h4 text-amber-600">{results.filter(r => r.correct).length}</p>
            <p className="label text-[var(--text-secondary)]">Correct</p>
          </div>
        </div>
      </div>

      {/* Progress Bar — slim 3px */}
      <div className="w-full h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
        <div
          style={{ width: `${progressPercent}%`, background: 'var(--accent)', transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)' }}
          className="h-full rounded-full"
        />
      </div>

      {/* Swipeable Word Card */}
      <LearningCard
        current={current}
        showDetails={showDetails}
        dragX={dragX}
        rotation={rotation}
        cardOpacity={cardOpacity}
        rightProgress={rightProgress}
        leftProgress={leftProgress}
        overlayColor={overlayColor}
        cardTransition={cardTransition}
        isDragging={isDragging}
        showMongolianHint={showMongolianHint}
        showSpaceHint={showSpaceHint}
        cardRef={cardRef as React.RefObject<HTMLDivElement>}
        onCardDown={handleCardDown}
        onCardMove={handleCardMove}
        onCardUp={handleCardUp}
        onCardLeave={handleCardLeave}
        onFlip={() => setShowDetails(!showDetails)}
        onRate={rateWithQuality}
      />

      {/* Button Controls (desktop-friendly) */}
      {!showDetails && (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleButtonRate('left')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              border: '1.5px solid rgba(239,68,68,0.3)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
          >
            <ThumbsDown size={18} />
            Not Yet
          </button>
          <button
            onClick={() => handleButtonRate('right')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(34,197,94,0.1)',
              color: '#22c55e',
              border: '1.5px solid rgba(34,197,94,0.3)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.1)')}
          >
            Got It!
            <ThumbsUp size={18} />
          </button>
        </div>
      )}

      {/* Session Results Summary */}
      {results.length > 0 && (
        <SurfaceCard padding="md" className="bg-gradient-to-r from-green-500/10 to-green-400/5 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="label text-[var(--text)]">Session Progress</p>
              <p className="text-sm text-[var(--text-secondary)]">{results.filter(r => r.correct).length} correct out of {results.length}</p>
            </div>
            <div className="text-right">
              <p className="h4 text-green-600">{Math.round((results.filter(r => r.correct).length / results.length) * 100)}%</p>
              <p className="text-xs text-[var(--text-secondary)]">Accuracy</p>
            </div>
          </div>
        </SurfaceCard>
      )}

      {/* Undo Pill */}
      {undoVisible && undoWord && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full shadow-lg border border-[var(--border)] bg-[var(--surface)]"
          style={{ animation: 'scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          <span className="text-sm text-[var(--text)]">Swiped &ldquo;{undoWord.word}&rdquo;</span>
          <button
            onClick={handleUndo}
            className="text-sm font-bold text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            Undo
          </button>
        </div>
      )}

      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} page="learn" />
    </div>
  )
}
