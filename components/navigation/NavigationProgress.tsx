'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pathnameRef = useRef(pathname)

  // Start bar immediately on any internal link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      // Only internal same-origin navigation (not hash links, not current page)
      if (!href || href.startsWith('http') || href.startsWith('#') || href === pathnameRef.current) return
      setVisible(true)
      setProgress(15)
      // Fake-progress: fast start, slows to ~85%, waits for pathname change
      let p = 15
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        p = p < 60 ? p + 8 : p < 80 ? p + 2 : p < 85 ? p + 0.4 : p
        setProgress(Math.min(p, 85))
      }, 120)
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  // Complete + fade on pathname change
  useEffect(() => {
    if (pathname === pathnameRef.current) return
    pathnameRef.current = pathname
    if (timerRef.current) clearInterval(timerRef.current)
    setProgress(100)
    const t = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 350)
    return () => clearTimeout(t)
  }, [pathname])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 z-[9999] h-[2px] pointer-events-none"
      style={{
        width: `${progress}%`,
        background: 'var(--accent)',
        boxShadow: '0 0 6px var(--accent)',
        transition:
          progress === 100
            ? 'width 200ms ease-out, opacity 150ms 200ms ease'
            : 'width 110ms linear',
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  )
}
