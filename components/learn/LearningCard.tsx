'use client'

import React from 'react'
import { CheckCircle, XCircle, Volume2 } from 'lucide-react'
import SurfaceCard from '@/components/design/SurfaceCard'
import RatingButtons from '@/components/learn/RatingButtons'
import { speakWord } from '@/lib/speech-utils'

interface Word {
  word: string
  definition: string
  mongolian?: string
  part_of_speech?: string
  cefr_level?: string
  ipa?: string
  examples?: string[]
  etymology_hint?: string
  isNew?: boolean
}

interface LearningCardProps {
  current: Word
  showDetails: boolean
  dragX: number
  rotation: number
  cardOpacity: number
  rightProgress: number
  leftProgress: number
  overlayColor: string
  cardTransition: string
  isDragging: boolean
  showMongolianHint: boolean
  showSpaceHint: boolean
  cardRef: React.RefObject<HTMLDivElement>
  onCardDown: (e: React.MouseEvent | React.TouchEvent) => void
  onCardMove: (e: React.MouseEvent | React.TouchEvent) => void
  onCardUp: (e: React.MouseEvent | React.TouchEvent) => void
  onCardLeave: (e: React.MouseEvent) => void
  onFlip: () => void
  onRate: (quality: number) => void
}

export default function LearningCard({
  current,
  showDetails,
  dragX,
  rotation,
  cardOpacity,
  rightProgress,
  leftProgress,
  overlayColor,
  cardTransition,
  isDragging,
  showMongolianHint,
  showSpaceHint,
  cardRef,
  onCardDown,
  onCardMove,
  onCardUp,
  onCardLeave,
  onFlip,
  onRate,
}: LearningCardProps) {
  const examples = Array.isArray(current.examples) ? current.examples : []

  return (
    <div
      ref={cardRef}
      onTouchStart={onCardDown}
      onTouchMove={onCardMove}
      onTouchEnd={onCardUp}
      onMouseDown={onCardDown}
      onMouseMove={onCardMove}
      onMouseUp={onCardUp}
      onMouseLeave={onCardLeave}
      className="relative w-full cursor-grab active:cursor-grabbing rounded-2xl select-none"
      style={{
        height: 'calc(100svh - 220px)',
        maxHeight: '560px',
        minHeight: '380px',
        perspective: '1000px',
        touchAction: 'none',
        userSelect: 'none',
        transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
        opacity: cardOpacity,
        transition: cardTransition,
        transformOrigin: 'center bottom',
      }}
    >
      {/* Card Flip Container */}
      <div
        className="relative w-full h-full select-none"
        style={{
          transformStyle: 'preserve-3d',
          transform: showDetails ? 'rotateY(180deg)' : 'rotateY(0deg)',
          touchAction: 'none',
          transition: 'transform 700ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          cursor: 'pointer',
        }}
        onClick={() => {
          if (Math.abs(dragX) < 5) onFlip()
        }}
      >
        {/* ── Front of Card ── */}
        <div
          className="absolute w-full h-full select-none"
          style={{ backfaceVisibility: 'hidden', touchAction: 'none' }}
        >
          <SurfaceCard hover={false} padding="lg" className="text-center relative h-full flex flex-col justify-between bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] overflow-hidden">
            {dragX !== 0 && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: overlayColor, pointerEvents: 'none', transition: 'none', zIndex: 1 }} />
            )}

            {/* GOT IT stamp */}
            <div style={{ position: 'absolute', top: 28, left: 24, zIndex: 10, opacity: rightProgress, transform: `rotate(-18deg) scale(${0.7 + rightProgress * 0.35})`, pointerEvents: 'none', transition: isDragging ? 'none' : 'all 150ms ease' }}>
              <div style={{ border: '3px solid var(--success)', color: 'var(--success)', padding: '4px 14px', borderRadius: '6px', fontWeight: 900, fontSize: '22px', fontFamily: 'var(--font-display, serif)', letterSpacing: '2px', textTransform: 'uppercase', lineHeight: 1.2, textShadow: '0 0 12px color-mix(in srgb, var(--success) 40%, transparent)', boxShadow: '0 0 0 1px color-mix(in srgb, var(--success) 20%, transparent)' }}>
                GOT IT ✓
              </div>
            </div>

            {/* NOT YET stamp */}
            <div style={{ position: 'absolute', top: 28, right: 24, zIndex: 10, opacity: leftProgress, transform: `rotate(18deg) scale(${0.7 + leftProgress * 0.35})`, pointerEvents: 'none', transition: isDragging ? 'none' : 'all 150ms ease' }}>
              <div style={{ border: '3px solid var(--error)', color: 'var(--error)', padding: '4px 14px', borderRadius: '6px', fontWeight: 900, fontSize: '22px', fontFamily: 'var(--font-display, serif)', letterSpacing: '2px', textTransform: 'uppercase', lineHeight: 1.2, textShadow: '0 0 12px color-mix(in srgb, var(--error) 40%, transparent)', boxShadow: '0 0 0 1px color-mix(in srgb, var(--error) 20%, transparent)' }}>
                ✗ NOPE
              </div>
            </div>

            {current.isNew && (
              <div className="absolute top-4 right-4 z-20">
                <span className="inline-block bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">NEW</span>
              </div>
            )}

            {/* Word display */}
            <div className="space-y-3 relative z-0">
              <h1 className="word-hero text-center">{current.word}</h1>
              <div className="flex items-center justify-center gap-3">
                {current.ipa && (
                  <p className="text-[15px] text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-monospace)' }}>{current.ipa}</p>
                )}
                <button onClick={(e) => { e.stopPropagation(); speakWord(current.word) }} className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all duration-150" title="Pronounce word">
                  <Volume2 size={18} />
                </button>
              </div>
              {current.part_of_speech && (
                <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">{current.part_of_speech}</p>
              )}
              {showMongolianHint && current.mongolian && (
                <p className="text-center text-sm text-[var(--text-secondary)] italic opacity-70 mt-1">{current.mongolian}</p>
              )}
            </div>

            {/* Swipe indicators */}
            <div className="space-y-4 mt-auto pt-6 border-t border-[var(--border)] relative z-0">
              <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-2" style={{ opacity: 0.3 + leftProgress * 0.7, transform: `translateX(${-leftProgress * 8}px) scale(${0.9 + leftProgress * 0.15})`, color: leftProgress > 0.1 ? `rgba(239, 68, 68, ${0.5 + leftProgress * 0.5})` : 'var(--text-secondary)', transition: isDragging ? 'none' : 'all 200ms ease' }}>
                  <XCircle size={24} />
                  <span className="font-semibold text-sm">Not Yet</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] font-medium">{showDetails ? 'Flip to swipe' : 'Swipe to rate'}</div>
                <div className="flex items-center gap-2" style={{ opacity: 0.3 + rightProgress * 0.7, transform: `translateX(${rightProgress * 8}px) scale(${0.9 + rightProgress * 0.15})`, color: rightProgress > 0.1 ? `rgba(34, 197, 94, ${0.5 + rightProgress * 0.5})` : 'var(--text-secondary)', transition: isDragging ? 'none' : 'all 200ms ease' }}>
                  <span className="font-semibold text-sm">Got It!</span>
                  <CheckCircle size={24} />
                </div>
              </div>
              <p className="label text-[var(--text-secondary)] text-center text-sm cursor-pointer hover:text-[var(--accent)] transition-colors">Tap card to flip</p>
              {showSpaceHint && (
                <div className="hidden md:flex items-center gap-1.5 mx-auto w-fit px-3 py-1.5 glass rounded-full" style={{ animation: 'fadeOut 300ms ease 2700ms forwards' }}>
                  <kbd className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--border)] px-1.5 py-0.5 rounded">Space</kbd>
                  <span className="text-[10px] text-[var(--text-secondary)]">to flip</span>
                </div>
              )}
            </div>
          </SurfaceCard>
        </div>

        {/* ── Back of Card ── */}
        <div
          className="absolute w-full h-full select-none"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', touchAction: 'none' }}
        >
          <SurfaceCard hover={false} padding="lg" className="relative h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={e => { e.stopPropagation(); speakWord(current.word) }} className="p-1.5 rounded-lg bg-[var(--bg)] hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all flex-shrink-0">
                  <Volume2 size={14} />
                </button>
                <span className="text-[15px] font-bold text-[var(--text-secondary)] truncate" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                  {current.word}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {current.part_of_speech && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/12 text-[var(--accent)] max-w-[90px] truncate">
                    {current.part_of_speech.split('(')[0].trim()}
                  </span>
                )}
                {current.cefr_level && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/12 text-indigo-500 dark:text-indigo-400">
                    {current.cefr_level}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl px-4 py-3.5 mb-3" style={{ background: 'color-mix(in srgb, var(--accent) 7%, var(--surface))' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)]/70 mb-1.5">Definition</p>
              <p className="text-[18px] font-semibold text-[var(--text)] leading-snug">{current.definition}</p>
              {current.mongolian && (
                <p className="text-[13px] text-[var(--text-secondary)] italic mt-2 pt-2 border-t border-[var(--border)]">🇲🇳 {current.mongolian}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5">
              {examples.length > 0 && (
                <div className="rounded-xl px-4 py-3.5" style={{ background: 'color-mix(in srgb, var(--accent) 7%, var(--surface))' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)]/70 mb-1.5">Example</p>
                  <p className="text-[14px] text-[var(--text)] italic leading-relaxed">&ldquo;{examples[0]}&rdquo;</p>
                </div>
              )}
              {current.etymology_hint && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
                  <span className="text-[13px] flex-shrink-0 mt-px">💡</span>
                  <p className="text-[12px] text-amber-600 dark:text-amber-400 leading-relaxed">{current.etymology_hint}</p>
                </div>
              )}
            </div>

            <RatingButtons onRate={onRate} />
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
