'use client'

import { useEffect, useState } from 'react'

const CONFETTI_COLORS = ['#c2650a', '#15803d', '#2563eb', '#9333ea', '#d97706', '#dc2626', '#0891b2', '#16a34a']

interface Dot {
  id: number
  color: string
  tx: string
  ty: string
  left: string
  top: string
  size: number
}

interface CelebrationBannerProps {
  /** Triggered on mount automatically */
  active?: boolean
}

export default function CelebrationBanner({ active = true }: CelebrationBannerProps) {
  const [dots, setDots] = useState<Dot[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) return
    const generated: Dot[] = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360
      const dist = 60 + Math.random() * 80
      const tx = `${Math.cos((angle * Math.PI) / 180) * dist}px`
      const ty = `${Math.sin((angle * Math.PI) / 180) * dist - 40}px`
      return {
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        tx,
        ty,
        left: `${30 + Math.random() * 40}%`,
        top: `${20 + Math.random() * 30}%`,
        size: 8 + Math.random() * 8,
      }
    })
    setDots(generated)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 1400)
    return () => clearTimeout(t)
  }, [active])

  if (!visible || dots.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 50 }}>
      {dots.map((dot) => (
        <div
          key={dot.id}
          style={{
            position: 'absolute',
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            borderRadius: '50%',
            background: dot.color,
            // @ts-expect-error CSS custom properties
            '--tx': dot.tx,
            '--ty': dot.ty,
            animation: `confettiFly 1.1s ease-out ${Math.random() * 200}ms both`,
          }}
        />
      ))}
    </div>
  )
}
