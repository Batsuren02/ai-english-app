'use client'

import { cn } from '@/lib/utils'

interface HeroSectionProps {
  greeting: string
  subtitle: string
  className?: string
  children?: React.ReactNode
}

export default function HeroSection({ greeting, subtitle, className, children }: HeroSectionProps) {
  return (
    <div
      className={cn('relative rounded-2xl overflow-hidden px-6 py-7', className)}
      style={{
        background: 'linear-gradient(-45deg, var(--bg), var(--accent-light), var(--bg), var(--bg-secondary))',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 12s ease infinite',
      }}
    >
      <h1
        className="text-[var(--text)] leading-tight"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 40px)',
          fontWeight: 700,
          fontStyle: 'italic',
          letterSpacing: '-0.02em',
          fontOpticalSizing: 'auto',
        }}
      >
        {greeting}
      </h1>
      <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-snug">{subtitle}</p>
      {children}
    </div>
  )
}
