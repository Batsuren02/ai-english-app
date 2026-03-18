'use client'
// lib/hooks/usePageCache.ts
// Stale-while-revalidate hook powered by lib/data-cache.ts.
// - First visit (no cache): shows loading skeleton, then renders on fetch complete.
// - Repeat visits (cache hit): renders immediately from cache, refetches in background.

import { useCallback, useEffect, useRef, useState } from 'react'
import { getCached, setCached } from '@/lib/data-cache'

interface PageCacheResult<T> {
  data: T | null
  loading: boolean   // true only when there is no cached data yet
  error: string | null
  reload: () => void
}

export function usePageCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 30_000,
): PageCacheResult<T> {
  const initialCached = getCached<T>(key)

  const [data, setData] = useState<T | null>(initialCached)
  const [loading, setLoading] = useState<boolean>(initialCached === null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // Always keep a stable ref to the latest fetcher without re-triggering the effect
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let cancelled = false

    const fresh = getCached<T>(key)
    if (fresh !== null) {
      setData(fresh)
      setLoading(false)
    } else {
      setLoading(true)
    }

    fetcherRef.current()
      .then((result) => {
        if (cancelled) return
        setCached(key, result, ttl)
        setData(result)
        setError(null)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load data')
        setLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ttl, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, reload }
}
