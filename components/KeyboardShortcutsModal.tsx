'use client'

import { useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'

interface ShortcutSection {
  title: string
  shortcuts: { key: string; action: string }[]
}

const GLOBAL_SHORTCUTS: ShortcutSection = {
  title: 'Global',
  shortcuts: [
    { key: '?', action: 'Show this help' },
    { key: 'Esc', action: 'Close modal / cancel' },
  ],
}

const LEARN_SHORTCUTS: ShortcutSection = {
  title: 'Review Session',
  shortcuts: [
    { key: 'Space / Enter', action: 'Flip card' },
    { key: '1', action: 'Again (forgot)' },
    { key: '2', action: 'Hard' },
    { key: '3', action: 'Good' },
    { key: '4', action: 'Easy (nailed it)' },
  ],
}

const QUIZ_SHORTCUTS: ShortcutSection = {
  title: 'Quiz',
  shortcuts: [
    { key: 'Enter', action: 'Submit / Next question' },
    { key: '1–4', action: 'Select MCQ option' },
  ],
}

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
  page?: 'learn' | 'quiz' | 'default'
}

export default function KeyboardShortcutsModal({ open, onClose, page = 'default' }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const sections = [
    GLOBAL_SHORTCUTS,
    ...(page === 'learn' ? [LEARN_SHORTCUTS] : []),
    ...(page === 'quiz' ? [QUIZ_SHORTCUTS] : []),
  ]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-enter"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="modal-enter bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: 'var(--shadow-xl)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-[var(--accent)]" />
            <h3 className="h4 text-[var(--text)]">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts */}
        <div className="p-5 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="label text-[var(--text-secondary)] mb-2 uppercase tracking-wide">{section.title}</p>
              <div className="space-y-1.5">
                {section.shortcuts.map(({ key, action }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="body-sm text-[var(--text)]">{action}</span>
                    <kbd
                      className="shrink-0 px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)] font-mono"
                      style={{ fontSize: 11 }}
                    >
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-4 text-center">
          <p className="text-[11px] text-[var(--text-secondary)]">Press <kbd className="px-1 py-0.5 rounded border border-[var(--border)] font-mono" style={{fontSize:10}}>?</kbd> anytime to toggle this</p>
        </div>
      </div>
    </div>
  )
}
