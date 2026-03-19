import { createClient } from '@supabase/supabase-js'

// Initialize Supabase — use placeholders at build time, validated at runtime
export const supabase = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  // Warn at runtime (not build time) if real credentials are missing
  if (typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    console.error('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your .env.local file.')
  }

  return createClient(url, key)
})()

// Re-export all domain types — existing code can keep importing from '@/lib/supabase'.
// New code should import from '@/lib/types' directly.
export * from './types'
