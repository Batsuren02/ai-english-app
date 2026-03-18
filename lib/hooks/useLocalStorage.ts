'use client'
// lib/hooks/useLocalStorage.ts
// Typed localStorage hook with SSR safety and error handling.

import { useCallback, useEffect, useState } from 'react'

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      return item !== null ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStored((prev) => {
          const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
          window.localStorage.setItem(key, JSON.stringify(next))
          return next
        })
      } catch {
        // localStorage unavailable (private mode, quota exceeded) — ignore silently
      }
    },
    [key],
  )

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return
      try {
        setStored(e.newValue !== null ? (JSON.parse(e.newValue) as T) : defaultValue)
      } catch {}
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [key, defaultValue])

  return [stored, setValue]
}
