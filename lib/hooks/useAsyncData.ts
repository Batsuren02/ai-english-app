'use client'
import { useState, useEffect, useCallback } from 'react'

export interface AsyncDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Generic hook for async data loading with cancellation support.
 * Replaces the repeated useState(null) + useState(true) + useEffect(loadFn) pattern.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
): AsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcher()
      .then(d => { if (!cancelled) { setData(d); setError(null) } })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load data')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // tick is the only dep — fetcher is stable (defined outside component or wrapped in useCallback)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const reload = useCallback(() => setTick(t => t + 1), [])

  return { data, loading, error, reload }
}
