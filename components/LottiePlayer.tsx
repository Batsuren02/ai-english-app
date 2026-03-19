'use client'

import Lottie from 'lottie-react'
import { useEffect, useRef, useState } from 'react'

type LottieVariant = 'cover' | 'center'

interface LottiePlayerProps {
  src: string
  loop?: boolean
  autoplay?: boolean
  size?: number
  className?: string
  /**
   * 'cover'  → fills entire viewport (for confetti)
   * 'center' → centered overlay at 420×420 (for level-up / trophy)
   * omitted  → inline, uses size prop
   */
  variant?: LottieVariant
  /** @deprecated Use variant='center' instead */
  fullscreen?: boolean
  /** Fallback auto-hide after N ms if onComplete never fires. Default: 5000 */
  fallbackMs?: number
  onComplete?: () => void
}

/**
 * Renders a Lottie animation from a JSON file in /public/animations/.
 * Silently no-ops if the file is missing.
 *
 * Replace files in public/animations/ with real animations from lottiefiles.com:
 *   confetti.json  — search "confetti celebration"    (use variant='cover')
 *   level-up.json  — search "level up star"           (use variant='cover')
 *   trophy.json    — search "trophy winner"           (use variant='center')
 *   xp-star.json   — search "star burst reward"       (inline)
 *   fire.json      — search "fire streak loop"        (inline, loop)
 */
export default function LottiePlayer({
  src,
  loop = false,
  autoplay = true,
  size = 200,
  className,
  variant,
  fullscreen,
  fallbackMs = 5000,
  onComplete,
}: LottiePlayerProps) {
  const [animationData, setAnimationData] = useState<object | null>(null)
  const firedRef = useRef(false)

  // Resolve variant (support deprecated fullscreen prop)
  const resolvedVariant: LottieVariant | undefined = variant ?? (fullscreen ? 'center' : undefined)
  const isOverlay = !!resolvedVariant

  useEffect(() => {
    firedRef.current = false
    setAnimationData(null)
    fetch(src)
      .then(r => r.json())
      .then(setAnimationData)
      .catch(() => {
        // File missing — fire onComplete so parent state resets
        if (isOverlay && onComplete && !firedRef.current) {
          firedRef.current = true
          onComplete()
        }
      })
  }, [src]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback timer: if onComplete never fires (loop or JSON issue), force-hide after fallbackMs
  useEffect(() => {
    if (!animationData || !isOverlay || loop) return
    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete?.()
      }
    }, fallbackMs)
    return () => clearTimeout(timer)
  }, [animationData, isOverlay, loop, fallbackMs]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleComplete() {
    if (!firedRef.current) {
      firedRef.current = true
      onComplete?.()
    }
  }

  if (!animationData) return null

  // ── Cover mode: fills entire viewport (confetti) ──────────────────────────
  if (resolvedVariant === 'cover') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        <Lottie
          animationData={animationData}
          loop={loop}
          autoplay={autoplay}
          onComplete={handleComplete}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    )
  }

  // ── Center mode: centered overlay at fixed size (level-up, trophy) ────────
  if (resolvedVariant === 'center') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <Lottie
          animationData={animationData}
          loop={loop}
          autoplay={autoplay}
          onComplete={handleComplete}
          style={{ width: 420, height: 420 }}
        />
      </div>
    )
  }

  // ── Inline mode ───────────────────────────────────────────────────────────
  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      onComplete={handleComplete}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
