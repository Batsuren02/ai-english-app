'use client'

import { useState } from 'react'
import { getLevelInfo, calculateQuizXP, calculateReviewXP } from '@/lib/xp-system'
import { showXPPopup } from '@/components/XPPopup'
import LottiePlayer from '@/components/LottiePlayer'
import LevelUpModal from '@/components/LevelUpModal'
import { Zap, Star, Trophy, Flame, Gift, ChevronUp } from 'lucide-react'

export default function GamificationTestPage() {
  const [testXP, setTestXP] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showTrophy, setShowTrophy] = useState(false)
  const [activeAnim, setActiveAnim] = useState<string | null>(null)
  const [levelUpTestData, setLevelUpTestData] = useState<{ oldLevel: number; newLevel: number; totalXp: number } | null>(null)

  const levelInfo = getLevelInfo(testXP)

  function triggerXPPopup(amount: number) {
    showXPPopup(amount)
  }

  function triggerAnim(name: string, setter: (v: boolean) => void) {
    setter(true)
    setActiveAnim(name)
  }

  function triggerLevelUpTest() {
    setShowConfetti(true)
    setShowLevelUp(true)
    setLevelUpTestData({ oldLevel: 2, newLevel: 3, totalXp: 1500 })
    setActiveAnim('levelup')
  }

  const xpPresets = [0, 100, 499, 500, 1000, 2000, 5000, 10000, 25000]

  const quizExample = calculateQuizXP(
    [
      { correct: true, easeFactor: 1.8 },
      { correct: true, easeFactor: 2.3 },
      { correct: false, easeFactor: 2.7 },
      { correct: true, easeFactor: 2.5 },
      { correct: true, easeFactor: 1.9 },
    ],
    3
  )

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
      {/* Lottie overlays */}
      {showConfetti && (
        <LottiePlayer src="/animations/confetti.json" variant="cover" fallbackMs={5000} onComplete={() => { setShowConfetti(false); setActiveAnim(null) }} />
      )}
      {showLevelUp && (
        <LottiePlayer src="/animations/level-up.json" variant="cover" fallbackMs={5000} onComplete={() => setShowLevelUp(false)} />
      )}
      {showTrophy && (
        <LottiePlayer src="/animations/trophy.json" variant="center" fallbackMs={5000} onComplete={() => { setShowTrophy(false); setActiveAnim(null) }} />
      )}
      <LevelUpModal
        isOpen={!!levelUpTestData}
        oldLevel={levelUpTestData?.oldLevel ?? 1}
        newLevel={levelUpTestData?.newLevel ?? 2}
        totalXp={levelUpTestData?.totalXp ?? 0}
        onClose={() => { setLevelUpTestData(null); setShowLevelUp(false); setShowConfetti(false); setActiveAnim(null) }}
      />

      {/* Header */}
      <div>
        <h1 className="h2 text-[var(--text)] mb-1">🎮 Gamification Test Lab</h1>
        <p className="body text-[var(--text-secondary)]">Trigger animations and preview XP/level calculations.</p>
      </div>

      {/* ── Level Card ── */}
      <section className="space-y-3">
        <h2 className="label text-[var(--text-secondary)] uppercase tracking-widest">Level Progress Card</h2>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                <Zap size={16} className="text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[var(--text)]">Level {levelInfo.level} · {levelInfo.label}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">{levelInfo.currentXP} / {levelInfo.xpToNext} XP to Level {levelInfo.level + 1}</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent)]">
              {Math.round(levelInfo.progress * 100)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.round(levelInfo.progress * 100)}%`, background: 'var(--gradient-accent)' }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-secondary)]">Total XP: <strong className="text-[var(--text)]">{testXP}</strong></p>
        </div>

        {/* XP slider */}
        <div className="space-y-2">
          <label className="text-[12px] font-semibold text-[var(--text-secondary)]">Simulate total XP: <span className="text-[var(--accent)]">{testXP} XP</span></label>
          <input
            type="range"
            min={0}
            max={30000}
            step={50}
            value={testXP}
            onChange={e => setTestXP(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex flex-wrap gap-2">
            {xpPresets.map(p => (
              <button
                key={p}
                onClick={() => setTestXP(p)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border ${testXP === p
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]'}`}
              >
                {p} XP
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inline Lottie previews ── */}
      <section className="space-y-3">
        <h2 className="label text-[var(--text-secondary)] uppercase tracking-widest">Lottie Animations (inline preview)</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Fire — loops */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col items-center gap-2">
            <LottiePlayer src="/animations/fire.json" loop size={100} />
            <p className="text-[11px] font-semibold text-[var(--text-secondary)]">🔥 fire.json (streak)</p>
          </div>
          {/* XP star — loops */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col items-center gap-2">
            <LottiePlayer src="/animations/xp-star.json" loop size={100} />
            <p className="text-[11px] font-semibold text-[var(--text-secondary)]">⭐ xp-star.json (XP gain)</p>
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)]">confetti.json, level-up.json, trophy.json are fullscreen — use buttons below to trigger.</p>
      </section>

      {/* ── Fullscreen animation triggers ── */}
      <section className="space-y-3">
        <h2 className="label text-[var(--text-secondary)] uppercase tracking-widest">Fullscreen Animations</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => triggerAnim('confetti', setShowConfetti)}
            disabled={!!activeAnim}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]
              hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_5%,var(--surface))] transition-all disabled:opacity-40"
          >
            <span className="text-2xl">🎉</span>
            <span className="text-[12px] font-semibold text-[var(--text)]">Confetti</span>
            <span className="text-[10px] text-[var(--text-secondary)]">Quiz ≥80%</span>
          </button>

          <button
            onClick={triggerLevelUpTest}
            disabled={!!activeAnim}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]
              hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_5%,var(--surface))] transition-all disabled:opacity-40"
          >
            <ChevronUp size={24} className="text-[var(--accent)]" />
            <span className="text-[12px] font-semibold text-[var(--text)]">Level Up</span>
            <span className="text-[10px] text-[var(--text-secondary)]">Level increase</span>
          </button>

          <button
            onClick={() => triggerAnim('trophy', setShowTrophy)}
            disabled={!!activeAnim}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]
              hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_5%,var(--surface))] transition-all disabled:opacity-40"
          >
            <Trophy size={24} className="text-[var(--accent)]" />
            <span className="text-[12px] font-semibold text-[var(--text)]">Trophy</span>
            <span className="text-[10px] text-[var(--text-secondary)]">Achievement</span>
          </button>
        </div>
        {activeAnim && (
          <p className="text-[11px] text-center text-[var(--text-secondary)] animate-pulse">Playing {activeAnim} animation… (plays once then stops)</p>
        )}
      </section>

      {/* ── XP Popup trigger ── */}
      <section className="space-y-3">
        <h2 className="label text-[var(--text-secondary)] uppercase tracking-widest">XP Popup</h2>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 20, 30, 50].map(xp => (
            <button
              key={xp}
              onClick={() => triggerXPPopup(xp)}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'var(--accent)' }}
            >
              +{xp} XP
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[var(--text-secondary)]">Click to trigger the floating XP popup that appears during quiz/learn.</p>
      </section>

      {/* ── XP Formula ── */}
      <section className="space-y-3">
        <h2 className="label text-[var(--text-secondary)] uppercase tracking-widest">XP Formula Preview</h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3 text-[13px]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <span className="text-[var(--text-secondary)]">Hard word (ease &lt; 2.0)</span>
            <span className="font-semibold text-[var(--text)]">{calculateReviewXP(1.8, 0)} XP base</span>
            <span className="text-[var(--text-secondary)]">Medium word (ease 2.0–2.5)</span>
            <span className="font-semibold text-[var(--text)]">{calculateReviewXP(2.3, 0)} XP base</span>
            <span className="text-[var(--text-secondary)]">Easy word (ease &gt; 2.5)</span>
            <span className="font-semibold text-[var(--text)]">{calculateReviewXP(2.7, 0)} XP base</span>
            <span className="text-[var(--text-secondary)]">With 3-day streak (×1.3)</span>
            <span className="font-semibold text-[var(--text)]">{calculateReviewXP(2.3, 3)} XP</span>
            <span className="text-[var(--text-secondary)]">With 10-day streak (×2.0 cap)</span>
            <span className="font-semibold text-[var(--text)]">{calculateReviewXP(2.3, 10)} XP</span>
            <span className="text-[var(--text-secondary)]">5-question quiz (100% accuracy, 3d streak)</span>
            <span className="font-bold text-[var(--accent)]">{quizExample} XP total</span>
          </div>
        </div>
      </section>

      {/* ── Level thresholds ── */}
      <section className="space-y-3">
        <h2 className="label text-[var(--text-secondary)] uppercase tracking-widest">Level Thresholds</h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {[1,2,3,4,5,6,7,8].map(lvl => {
            const info = getLevelInfo(lvl === 1 ? 0 : Math.round(500 * Math.pow(lvl - 1, 1.5)))
            const threshold = lvl === 1 ? 0 : Math.round(500 * Math.pow(lvl - 1, 1.5))
            const isCurrentLevel = info.level === levelInfo.level
            return (
              <div key={lvl} className={`flex items-center justify-between px-5 py-3 border-b border-[var(--border)] last:border-0
                ${isCurrentLevel ? 'bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))]' : ''}`}>
                <div className="flex items-center gap-3">
                  {isCurrentLevel && <Zap size={12} className="text-[var(--accent)]" />}
                  <span className={`text-[13px] font-semibold ${isCurrentLevel ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                    Level {lvl} · {['Beginner','Explorer','Scholar','Expert','Master','Legend','Legend','Legend'][lvl-1]}
                  </span>
                </div>
                <span className="text-[12px] text-[var(--text-secondary)]">{threshold.toLocaleString()} XP</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
