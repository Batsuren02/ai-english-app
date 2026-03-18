'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Brain, BookMarked, Zap, BarChart2, BookOpen, FileText, Mic2, X, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRACTICE_ITEMS = [
  { href: '/quiz',          label: 'Quiz',     icon: BookOpen, color: '#2563eb' },
  { href: '/drills',        label: 'Drills',   icon: Zap,      color: '#d97706' },
  { href: '/reading',       label: 'Reading',  icon: FileText, color: '#7c3aed' },
  { href: '/pronunciation', label: 'Speaking', icon: Mic2,     color: '#0891b2' },
  { href: '/writing',       label: 'Writing',  icon: PenLine,  color: '#059669' },
]

const PRACTICE_PATHS = PRACTICE_ITEMS.map(i => i.href)

export default function BottomTabBar() {
  const pathname = usePathname()
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Clear pending state once navigation completes
  useEffect(() => { setPendingHref(null) }, [pathname])

  const isPracticeActive = PRACTICE_PATHS.includes(pathname)

  const tabs = [
    { href: '/',      label: 'Home',     icon: LayoutDashboard },
    { href: '/learn', label: 'Learn',    icon: Brain           },
    { href: '/words', label: 'Words',    icon: BookMarked      },
    { label: 'Practice', icon: Zap, isPractice: true          },
    { href: '/stats', label: 'Stats',    icon: BarChart2       },
  ]

  return (
    <>
      {/* Practice sub-sheet backdrop */}
      {practiceOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.45)', animation: 'backdropIn 180ms ease forwards' }}
          onClick={() => setPracticeOpen(false)}
        />
      )}

      {/* Practice sub-sheet */}
      {practiceOpen && (
        <div
          className="fixed bottom-16 inset-x-0 z-50 md:hidden rounded-t-3xl border-t border-[var(--border)] bg-[var(--surface)] px-5 pt-4 pb-6"
          style={{ animation: 'slideInUp 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">Practice</p>
            <button onClick={() => setPracticeOpen(false)} className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PRACTICE_ITEMS.map(({ href, label, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setPracticeOpen(false)}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-2xl border transition-all',
                  pathname === href
                    ? 'border-[var(--accent)]/40 bg-[var(--accent)]/5'
                    : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-light)]'
                )}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <span className="text-[13px] font-semibold text-[var(--text)]">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 h-16 z-50 md:hidden bg-[var(--surface)]/90 border-t border-[var(--border)]"
        style={{
          backdropFilter: 'blur(16px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="grid grid-cols-5 h-full">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.isPractice
              ? isPracticeActive
              : (tab.href ? (pendingHref ? pendingHref === tab.href : pathname === tab.href) : false)

            if (tab.isPractice) {
              return (
                <button
                  key="practice"
                  onClick={() => setPracticeOpen(v => !v)}
                  className="relative flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  {isPracticeActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[var(--accent)] rounded-full" />
                  )}
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.75}
                    className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}
                  />
                  <span
                    className="text-[10px] font-medium leading-none"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
                  >
                    {tab.label}
                  </span>
                </button>
              )
            }

            return (
              <Link
                key={tab.href}
                href={tab.href!}
                onClick={() => tab.href && setPendingHref(tab.href)}
                className="relative flex flex-col items-center justify-center gap-1 transition-colors"
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[var(--accent)] rounded-full" />
                )}
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
