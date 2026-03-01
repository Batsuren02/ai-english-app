'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { BookOpen, LayoutDashboard, BookMarked, Brain, BarChart2, Settings, Moon, Sun, Menu, X } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/learn', label: 'Learn', icon: Brain },
  { href: '/words', label: 'Words', icon: BookMarked },
  { href: '/quiz', label: 'Quiz', icon: BookOpen },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  return (
    <html lang="en">
      <head>
        <title>English Learning App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          {/* Sidebar */}
          <nav style={{
            width: 220,
            background: 'var(--bg-card)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 0',
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            zIndex: 100,
          }} className="hidden md:flex">
            <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <h1 style={{ fontSize: 20, fontFamily: 'var(--font-display)', color: 'var(--accent)', lineHeight: 1.2 }}>
                English<br />
                <span style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 400 }}>Learning App</span>
              </h1>
            </div>
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 20px', margin: '2px 8px',
                  borderRadius: 8, textDecoration: 'none',
                  color: active ? 'white' : 'var(--ink-light)',
                  background: active ? 'var(--accent)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  fontSize: 14, transition: 'all 0.15s',
                }}>
                  <Icon size={16} />
                  {label}
                </Link>
              )
            })}
            <div style={{ marginTop: 'auto', padding: '0 20px' }}>
              <button onClick={toggleDark} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-light)', fontSize: 13, padding: '8px 0',
              }}>
                {dark ? <Sun size={14} /> : <Moon size={14} />}
                {dark ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </nav>

          {/* Mobile header */}
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: 56,
            background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', zIndex: 200,
          }} className="flex md:hidden">
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)', fontWeight: 700 }}>EnglishApp</span>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {menuOpen && (
            <div style={{
              position: 'fixed', top: 56, left: 0, right: 0, bottom: 0,
              background: 'var(--bg-card)', zIndex: 150, padding: 16,
            }} className="flex md:hidden flex-col gap-2">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 10, textDecoration: 'none',
                  color: pathname === href ? 'white' : 'var(--ink)',
                  background: pathname === href ? 'var(--accent)' : 'transparent',
                  fontSize: 16,
                }}>
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
              <button onClick={toggleDark} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', fontSize: 16 }}>
                {dark ? <Sun size={18} /> : <Moon size={18} />}
                {dark ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          )}

          {/* Main content */}
          <main style={{ flex: 1, marginLeft: 0, paddingTop: 0 }} className="md:ml-[220px] pt-14 md:pt-0">
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
