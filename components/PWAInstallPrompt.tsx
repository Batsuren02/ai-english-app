'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed this session
    if (dismissed) return

    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event for later use
      setPromptEvent(e)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [dismissed])

  const handleInstall = async () => {
    if (!promptEvent) return

    promptEvent.prompt()
    const result = await promptEvent.userChoice

    if (result.outcome === 'accepted') {
      setIsVisible(false)
      setDismissed(true)
    }

    setPromptEvent(null)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setDismissed(true)
  }

  if (!isVisible || !promptEvent) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:right-auto md:left-auto md:bottom-6 md:w-[300px]
                    bg-accent text-white rounded-lg shadow-lg p-4 space-y-3 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Download className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Install App</p>
            <p className="text-xs opacity-90">Learn English on the go</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleInstall}
          size="sm"
          className="flex-1 bg-white text-accent hover:bg-gray-100"
        >
          Install
        </Button>
        <Button
          onClick={handleDismiss}
          size="sm"
          variant="outline"
          className="flex-1 border-white/30 text-white hover:bg-white/10"
        >
          Later
        </Button>
      </div>
    </div>
  )
}
