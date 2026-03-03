'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme-context'
import { Palette } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * ThemeSwitcher - Dropdown menu for changing app theme
 * Displays available themes with visual preview
 */
export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted on client
  if (!mounted) {
    return null
  }

  const { currentTheme, setTheme, availableThemes } = useTheme()

  const themeLabels: Record<string, string> = {
    light: '☀️ Light',
    dark: '🌙 Dark',
    palenight: '🌌 Pale Night',
    vampire: '🧛 Vampire',
    oceanic: '🌊 Oceanic',
  }

  const handleThemeChange = (value: string) => {
    setTheme(value as any)
  }

  return (
    <div className="flex items-center gap-2">
      <Palette size={16} style={{ color: 'var(--text-secondary)' }} />
      <Select value={currentTheme} onValueChange={handleThemeChange}>
        <SelectTrigger
          className="w-auto border-none bg-transparent px-2 py-1 h-auto"
          style={{
            color: 'var(--text)',
          }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          {availableThemes.map((theme) => (
            <SelectItem
              key={theme}
              value={theme}
              style={{
                color: 'var(--text)',
                backgroundColor: currentTheme === theme ? 'var(--accent-light)' : 'transparent',
              }}
            >
              {themeLabels[theme] || theme}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default ThemeSwitcher
