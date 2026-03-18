'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import {
  LayoutDashboard, Brain, BookMarked, BookOpen,
  Zap, FileText, Mic2, BarChart2, Settings
} from 'lucide-react'

const MAIN_NAV = [
  { href: '/',      label: 'Dashboard', icon: LayoutDashboard },
  { href: '/learn', label: 'Learn',     icon: Brain           },
  { href: '/words', label: 'Words',     icon: BookMarked      },
]

const PRACTICE_NAV = [
  { href: '/quiz',          label: 'Quiz',     icon: BookOpen },
  { href: '/drills',        label: 'Drills',   icon: Zap      },
  { href: '/reading',       label: 'Reading',  icon: FileText },
  { href: '/pronunciation', label: 'Speaking', icon: Mic2     },
]

const BOTTOM_NAV = [
  { href: '/stats',    label: 'Stats',    icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings  },
]

interface NavItemProps {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onClick?: () => void
  indent?: boolean
}

function NavItem({ href, label, icon: Icon, active, onClick, indent }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150',
        indent && 'pl-5',
        active
          ? 'bg-[var(--accent)] text-white shadow-sm'
          : 'text-[var(--text-secondary)] hover:bg-[var(--border-light)] hover:text-[var(--text)]'
      )}
    >
      <Icon size={15} strokeWidth={active ? 2.5 : 2} />
      {label}
    </Link>
  )
}

interface SidebarNavProps {
  pathname: string
  onNavigate?: () => void
}

export default function SidebarNav({ pathname, onNavigate }: SidebarNavProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pb-4 mb-1 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
            <BookMarked size={16} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1
              className="text-[15px] text-[var(--text)] leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontStyle: 'italic',
                letterSpacing: '-0.02em',
              }}
            >
              Lexicon
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)] leading-tight">English Learning</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1 overflow-y-auto">
        {MAIN_NAV.map(({ href, label, icon }) => (
          <NavItem key={href} href={href} label={label} icon={icon} active={pathname === href} onClick={onNavigate} />
        ))}

        {/* Practice section */}
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] px-3 pt-4 pb-1 select-none">
          Practice
        </p>
        {PRACTICE_NAV.map(({ href, label, icon }) => (
          <NavItem key={href} href={href} label={label} icon={icon} active={pathname === href} onClick={onNavigate} indent />
        ))}
      </nav>

      {/* Bottom: Stats + Settings + Theme */}
      <div className="px-3 pb-2 pt-2 border-t border-[var(--border)] flex-shrink-0 space-y-0.5">
        {BOTTOM_NAV.map(({ href, label, icon }) => (
          <NavItem key={href} href={href} label={label} icon={icon} active={pathname === href} onClick={onNavigate} />
        ))}
        <div className="px-1 pt-2">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
