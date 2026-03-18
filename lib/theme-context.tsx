'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ThemeName, getTheme, getThemeNames, isValidThemeName } from './theme-config'

interface ThemeContextType {
  currentTheme: ThemeName
  setTheme: (theme: ThemeName) => void
  availableThemes: ThemeName[]
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const THEME_STORAGE_KEY = 'app-theme'
const DEFAULT_THEME: ThemeName = 'light'

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * ThemeProvider component - wraps app to provide theme context
 * Manages theme state, localStorage persistence, and CSS variable application
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentTheme, setCurrentThemeState] = useState<ThemeName>(DEFAULT_THEME)
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage on mount
  useEffect(() => {
    // Get theme from localStorage or system preference
    let savedTheme: ThemeName | null = null

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored && isValidThemeName(stored)) {
        savedTheme = stored
      }
    }

    const themeToUse = savedTheme || DEFAULT_THEME
    setCurrentThemeState(themeToUse)
    applyTheme(themeToUse)
    setMounted(true)
  }, [])

  // Apply theme to DOM and CSS variables
  const applyTheme = (themeName: ThemeName) => {
    if (typeof document === 'undefined') return

    const theme = getTheme(themeName)
    const root = document.documentElement

    // Update CSS variables
    root.style.setProperty('--bg', theme.colors.bg)
    root.style.setProperty('--bg-secondary', theme.colors.bgSecondary)
    root.style.setProperty('--surface', theme.colors.surface)
    root.style.setProperty('--surface-hover', theme.colors.surfaceHover)
    root.style.setProperty('--text', theme.colors.text)
    root.style.setProperty('--text-secondary', theme.colors.textSecondary)
    root.style.setProperty('--accent', theme.colors.accent)
    root.style.setProperty('--accent-secondary', theme.colors.accentSecondary)
    root.style.setProperty('--accent-light', theme.colors.accentLight)
    root.style.setProperty('--border', theme.colors.border)
    root.style.setProperty('--border-light', theme.colors.borderLight)
    root.style.setProperty('--success', theme.colors.success)
    root.style.setProperty('--error', theme.colors.error)
    root.style.setProperty('--warning', theme.colors.warning)
    root.style.setProperty('--shadow', theme.colors.shadow)
    // V3.0 glass surfaces
    root.style.setProperty('--surface-glass', theme.colors.surfaceGlass || 'rgba(255,255,255,0.72)')
    root.style.setProperty('--surface-elevated', theme.colors.surfaceElevated || theme.colors.surface)
  }

  // Handle theme change
  const setTheme = (themeName: ThemeName) => {
    if (!isValidThemeName(themeName)) {
      console.error(`Invalid theme name: ${themeName}`)
      return
    }

    setCurrentThemeState(themeName)
    applyTheme(themeName)

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, themeName)
    }

    // Dispatch custom event for other listeners (optional)
    window.dispatchEvent(
      new CustomEvent('theme-change', { detail: { theme: themeName } })
    )
  }

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    availableThemes: getThemeNames(),
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to use theme context
 * Must be used within ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}

/**
 * Hook to get current theme object
 */
export function useCurrentTheme() {
  const { currentTheme } = useTheme()
  return getTheme(currentTheme)
}
