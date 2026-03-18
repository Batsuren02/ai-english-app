'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { ToastProvider } from '@/components/ToastProvider'
import { ThemeProvider } from '@/lib/theme-context'
import SidebarNav from '@/components/navigation/SidebarNav'
import BottomTabBar from '@/components/navigation/BottomTabBar'

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[var(--bg)]">

        {/* ─── Desktop sidebar (md+) ─────────────────────────────── */}
        <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[240px] z-40
                          bg-[var(--surface)] border-r border-[var(--border)] pt-5 pb-4">
          <SidebarNav pathname={pathname} />
        </aside>

        {/* ─── Mobile slim top bar (below md) ────────────────────── */}
        <header className="md:hidden fixed top-0 inset-x-0 z-50 h-10 flex items-center justify-between
                           px-4 bg-[var(--surface)]/90 border-b border-[var(--border)]"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <span
            className="text-[15px] text-[var(--text)]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '-0.02em' }}
          >
            Lexicon
          </span>
          <Link href="/settings" className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-colors">
            <Settings size={17} strokeWidth={1.75} />
          </Link>
        </header>

        {/* ─── Main content ───────────────────────────────────────── */}
        {/* Desktop: offset by sidebar | Mobile: offset by slim top bar + bottom tab bar */}
        <main className="flex-1 md:ml-[240px] pt-10 pb-20 md:pt-0 md:pb-0 min-w-0">
          <div className="max-w-[900px] mx-auto px-5 py-8">
            {children}
          </div>
        </main>

        {/* ─── Mobile bottom tab bar ──────────────────────────────── */}
        <BottomTabBar />

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
        {/* Anti-flash: apply theme bg before React hydrates to prevent white flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'light';var m={'light':'#f4f0e6','dark':'#111009','palenight':'#151b35','vampire':'#0d0917','oceanic':'#0a2535','catppuccin':'#1e1e2e','rosepine':'#191724'};var bg=m[t]||m.light;document.documentElement.style.setProperty('--bg',bg);document.documentElement.style.background=bg;}catch(e){}})()`}} />
      </head>
      <body>
        <ThemeProvider>
          <LayoutInner>{children}</LayoutInner>
        </ThemeProvider>
      </body>
    </html>
  )
}
