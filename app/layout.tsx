'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BookOpen, LayoutDashboard, BookMarked, Brain, BarChart2, Settings, Menu, Upload, FileText, Mic2, Zap } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { ToastProvider } from '@/components/ToastProvider'
import { ThemeProvider } from '@/lib/theme-context'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

const NAV = [
  { href: '/',          label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/learn',     label: 'Learn',         icon: Brain           },
  { href: '/words',     label: 'Words',         icon: BookMarked      },
  { href: '/import',    label: 'Import',        icon: Upload          },
  { href: '/reading',   label: 'Reading',       icon: FileText        },
  { href: '/drills',    label: 'Drills',        icon: Zap             },
  { href: '/pronunciation', label: 'Pronunciation', icon: Mic2        },
  { href: '/quiz',      label: 'Quiz',          icon: BookOpen        },
  { href: '/stats',     label: 'Stats',         icon: BarChart2       },
  { href: '/settings',  label: 'Settings',      icon: Settings        },
]

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3 flex-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150',
              active
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-light)] hover:text-[var(--text)]'
            )}
          >
            <Icon size={15} strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarHeader() {
  return (
    <div className="px-4 pb-4 mb-1 border-b border-[var(--border)]">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
          <BookOpen size={15} color="white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[14px] font-bold text-[var(--text)] leading-tight" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
            Lexicon
          </h1>
          <p className="text-[11px] text-[var(--text-secondary)] leading-tight">English Learning</p>
        </div>
      </div>
    </div>
  )
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[var(--bg)]">

          {/* ─── Desktop sidebar (md+) ─────────────────────────────── */}
          <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[220px] z-40
                            bg-[var(--surface)] border-r border-[var(--border)] pt-5 pb-4">
            <SidebarHeader />
            <NavLinks pathname={pathname} />
            <div className="px-4 pt-3 border-t border-[var(--border)] mt-2">
              <ThemeSwitcher />
            </div>
          </aside>

          {/* ─── Mobile top bar + Sheet drawer (below md) ──────────── */}
          <header className="md:hidden fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between
                             px-4 bg-[var(--surface)] border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center">
                <BookOpen size={13} color="white" strokeWidth={2.5} />
              </div>
              <span className="text-[15px] font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>Lexicon</span>
            </div>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pt-12 pb-6 flex flex-col gap-0 w-[240px]">
                <SidebarHeader />
                <NavLinks pathname={pathname} onNavigate={() => setSheetOpen(false)} />
                <div className="px-4 pt-3 mt-2 border-t border-[var(--border)]">
                  <ThemeSwitcher />
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
    </ToastProvider>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>English Learning App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f3460" />
        <meta name="description" content="Spaced repetition vocabulary app for English learners" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ThemeProvider>
          <LayoutInner>{children}</LayoutInner>
        </ThemeProvider>
      </body>
    </html>
  )
}
