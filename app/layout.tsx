'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { BookOpen, LayoutDashboard, BookMarked, Brain, BarChart2, Settings, Moon, Sun, Menu, Upload, FileText, Mic2, Zap } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import XPPopup from '@/components/XPPopup'

const NAV = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/learn',     label: 'Learn',     icon: Brain           },
  { href: '/words',     label: 'Words',     icon: BookMarked      },
  { href: '/import',    label: 'Import',    icon: Upload          },
  { href: '/reading',   label: 'Reading',   icon: FileText        },
  { href: '/drills',    label: 'Drills',    icon: Zap             },
  { href: '/pronunciation', label: 'Pronunciation', icon: Mic2     },
  { href: '/quiz',      label: 'Quiz',      icon: BookOpen        },
  { href: '/stats',     label: 'Stats',     icon: BarChart2       },
  { href: '/settings',  label: 'Settings',  icon: Settings        },
]

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2 flex-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm transition-all',
              active
                ? 'bg-[var(--accent)] text-white font-semibold'
                : 'text-[var(--ink-light)] hover:bg-[var(--border)] hover:text-[var(--ink)]'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarHeader() {
  return (
    <div className="px-5 pb-5 mb-2 border-b border-[var(--border)]">
      <h1 className="font-display text-xl text-[var(--accent)] leading-snug">
        English<br />
        <span className="text-[var(--ink)] text-sm font-normal font-body">Learning App</span>
      </h1>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [dark, setDark] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') { setDark(true); document.documentElement.classList.add('dark') }
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const DarkToggle = () => (
    <button
      onClick={toggleDark}
      className="flex items-center gap-2 text-xs text-[var(--ink-light)] hover:text-[var(--ink)] transition-colors p-1 rounded"
    >
      {dark ? <Sun size={13} /> : <Moon size={13} />}
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  )

  return (
    <html lang="en">
      <head>
        <title>English Learning App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f3460" />
        <meta name="description" content="Spaced repetition vocabulary app for English learners" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <div className="flex min-h-screen bg-[var(--bg)]">

          {/* ─── Desktop sidebar (md+) ─────────────────────────────── */}
          <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[220px] z-40
                            bg-[var(--bg-card)] border-r border-[var(--border)] pt-6 pb-4">
            <SidebarHeader />
            <NavLinks pathname={pathname} />
            <div className="px-5 pt-3 border-t border-[var(--border)] mt-2">
              <DarkToggle />
            </div>
          </aside>

          {/* ─── Mobile top bar + Sheet drawer (below md) ──────────── */}
          <header className="md:hidden fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between
                             px-4 bg-[var(--bg-card)] border-b border-[var(--border)]">
            <span className="font-display font-bold text-[var(--accent)] text-lg">EnglishApp</span>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pt-12 pb-6 flex flex-col gap-0 w-[240px]">
                <SidebarHeader />
                <NavLinks pathname={pathname} onNavigate={() => setSheetOpen(false)} />
                <div className="px-5 pt-3 mt-2 border-t border-[var(--border)]">
                  <DarkToggle />
                </div>
              </SheetContent>
            </Sheet>
          </header>

          {/* ─── Main content ───────────────────────────────────────── */}
          {/* Desktop: offset by sidebar width | Mobile: offset by top bar height */}
          <main className="flex-1 md:ml-[220px] pt-14 md:pt-0 min-w-0">
            <div className="max-w-[900px] mx-auto px-5 py-8">
              {children}
            </div>
          </main>

        </div>

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* XP Popup Notifications */}
        <XPPopup />
      </body>
    </html>
  )
}
