'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({ className, width, height, rounded = 'md' }: SkeletonProps) {
  const radiusMap = { sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', full: 'rounded-full' }
  return (
    <div
      className={cn('shimmer bg-[var(--border)]', radiusMap[rounded], className)}
      style={{ width, height }}
    />
  )
}

/** A skeleton shaped like a stat card */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn('card p-5 rounded-lg border border-[var(--border)] space-y-3', className)}>
      <Skeleton className="mx-auto" width="32px" height="32px" rounded="md" />
      <Skeleton className="mx-auto" width="56px" height="28px" rounded="md" />
      <Skeleton className="mx-auto" width="72px" height="12px" rounded="sm" />
    </div>
  )
}

/** A skeleton shaped like a word card in the grid */
export function SkeletonWordCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-4 rounded-xl border border-[var(--border)] space-y-3', className)}>
      <div className="flex justify-between items-start">
        <Skeleton width="100px" height="16px" rounded="sm" />
        <Skeleton width="56px" height="20px" rounded="full" />
      </div>
      <Skeleton width="140px" height="12px" rounded="sm" />
      <Skeleton width="100%" height="10px" rounded="sm" />
      <Skeleton width="80%" height="10px" rounded="sm" />
      <div className="flex justify-between pt-1">
        <Skeleton width="60px" height="8px" rounded="sm" />
        <Skeleton width="40px" height="8px" rounded="sm" />
      </div>
    </div>
  )
}

/** A skeleton shaped like a quiz mode card */
export function SkeletonModeCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-4 rounded-xl border border-[var(--border)] space-y-2', className)}>
      <div className="flex items-center gap-3">
        <Skeleton width="32px" height="32px" rounded="md" />
        <Skeleton width="120px" height="18px" rounded="sm" />
      </div>
      <Skeleton width="100%" height="12px" rounded="sm" />
      <Skeleton width="70%" height="12px" rounded="sm" />
    </div>
  )
}

/** A skeleton for a flashcard */
export function SkeletonFlashcard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-8 rounded-xl border border-[var(--border)] space-y-4 min-h-[200px] flex flex-col justify-center items-center', className)}>
      <Skeleton width="160px" height="40px" rounded="md" />
      <Skeleton width="100px" height="16px" rounded="sm" />
      <Skeleton width="200px" height="12px" rounded="sm" />
    </div>
  )
}

export default Skeleton
