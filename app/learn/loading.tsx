import { SkeletonFlashcard } from '@/components/design/Skeleton'

export default function LearnLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="shimmer bg-[var(--border)] h-6 w-40 rounded-md" />
          <div className="shimmer bg-[var(--border)] h-4 w-28 rounded-sm" />
        </div>
        <div className="shimmer bg-[var(--border)] h-10 w-16 rounded-md" />
      </div>

      {/* Progress bar skeleton */}
      <div className="w-full h-[3px] bg-[var(--border)] rounded-full" />

      {/* Flashcard skeleton */}
      <SkeletonFlashcard className="min-h-[380px]" />

      {/* Button controls skeleton */}
      <div className="flex gap-4 justify-center">
        <div className="shimmer bg-[var(--border)] h-12 w-32 rounded-xl" />
        <div className="shimmer bg-[var(--border)] h-12 w-32 rounded-xl" />
      </div>
    </div>
  )
}
