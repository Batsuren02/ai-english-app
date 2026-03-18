import { SkeletonWordCard } from '@/components/design/Skeleton'

export default function WordsLoading() {
  return (
    <div className="space-y-6">
      {/* Header + search bar skeleton */}
      <div className="space-y-3">
        <div className="shimmer bg-[var(--border)] h-8 w-48 rounded-md" />
        <div className="shimmer bg-[var(--border)] h-10 w-full rounded-lg" />
      </div>

      {/* Filter pills skeleton */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shimmer bg-[var(--border)] h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Word cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonWordCard key={i} />
        ))}
      </div>
    </div>
  )
}
