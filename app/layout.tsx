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
import NavigationProgress from '@/components/navigation/NavigationProgress'

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
          <div className="max-w-[900px] mx-auto px-5 py-8 md:pt-4">
            {children}
          </div>
        </main>

        {/* ─── Mobile bottom tab bar ──────────────────────────────── */}
        <BottomTabBar />

      </div>

      {/* Route change progress bar */}
      <NavigationProgress />
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
        {/* Anti-flash: apply ALL core theme vars before React hydrates to prevent color-mismatch flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{
var t=localStorage.getItem('theme')||'light';
var themes={
  light:  {bg:'#f2f0ea',surface:'#ffffff',border:'#e2ddd5',text:'#1c1917',textSec:'#78716c'},
  dark:   {bg:'#111009',surface:'#1c1a15',border:'#2e2b23',text:'#f5f0e8',textSec:'#a09880'},
  palenight:{bg:'#151b35',surface:'#1e2547',border:'#2d3561',text:'#c8d3f5',textSec:'#7982b4'},
  vampire:{bg:'#0d0917',surface:'#1a0f2e',border:'#2d1b4e',text:'#e2d9f3',textSec:'#9580aa'},
  oceanic:{bg:'#0a2535',surface:'#0d2f40',border:'#1a4358',text:'#cdd3de',textSec:'#7a9ab0'},
  catppuccin:{bg:'#1e1e2e',surface:'#313244',border:'#45475a',text:'#cdd6f4',textSec:'#a6adc8'},
  rosepine:{bg:'#191724',surface:'#1f1d2e',border:'#2a2838',text:'#e0def4',textSec:'#908caa'}
};
var v=themes[t]||themes.light;
var r=document.documentElement;
r.style.setProperty('--bg',v.bg);
r.style.setProperty('--surface',v.surface);
r.style.setProperty('--border',v.border);
r.style.setProperty('--text',v.text);
r.style.setProperty('--text-secondary',v.textSec);
r.style.background=v.bg;
}catch(e){}})()`}} />
      </head>
      <body>
        <ThemeProvider>
          <LayoutInner>{children}</LayoutInner>
        </ThemeProvider>
      </body>
    </html>
  )
}
