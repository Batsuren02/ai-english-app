import { SkeletonModeCard } from '@/components/design/Skeleton'

export default function QuizLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="shimmer bg-[var(--border)] h-8 w-32 rounded-md" />
        <div className="shimmer bg-[var(--border)] h-4 w-56 rounded-sm" />
      </div>

      {/* Mode toggle skeleton */}
      <div className="flex gap-2">
        <div className="shimmer bg-[var(--border)] h-10 w-28 rounded-lg" />
        <div className="shimmer bg-[var(--border)] h-10 w-28 rounded-lg" />
      </div>

      {/* Quiz mode cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonModeCard key={i} />
        ))}
      </div>
    </div>
  )
}
