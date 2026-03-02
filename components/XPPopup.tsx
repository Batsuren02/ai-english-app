'use client'

import { useEffect, useState } from 'react'

interface Popup {
  id: number
  xp: number
  x: number
  y: number
}

export default function XPPopup() {
  const [popups, setPopups] = useState<Popup[]>([])
  const [nextId, setNextId] = useState(0)

  // Global function to show XP popup
  useEffect(() => {
    const handleXPEarned = (event: CustomEvent) => {
      const { xp, x, y } = event.detail
      const id = nextId
      setNextId((prev) => prev + 1)

      setPopups((prev) => [...prev, { id, xp, x: x || window.innerWidth / 2, y: y || window.innerHeight / 2 }])

      // Remove after animation (1s)
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id))
      }, 1000)
    }

    window.addEventListener('xpEarned', handleXPEarned as EventListener)
    return () => window.removeEventListener('xpEarned', handleXPEarned as EventListener)
  }, [nextId])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {popups.map((popup) => (
        <div
          key={popup.id}
          className="absolute float-up font-bold text-lg text-accent select-none"
          style={{
            left: popup.x,
            top: popup.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          +{popup.xp} XP
        </div>
      ))}
    </div>
  )
}

/**
 * Utility function to trigger XP popup
 */
export function showXPPopup(xp: number, x?: number, y?: number) {
  window.dispatchEvent(
    new CustomEvent('xpEarned', {
      detail: { xp, x, y },
    })
  )
}
