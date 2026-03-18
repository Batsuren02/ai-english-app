import { SkeletonStat } from '@/components/design/Skeleton'

export default function StatsLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="shimmer bg-[var(--border)] h-8 w-40 rounded-md" />
        <div className="shimmer bg-[var(--border)] h-4 w-64 rounded-sm" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="card p-5 rounded-xl border border-[var(--border)] space-y-3">
        <div className="shimmer bg-[var(--border)] h-5 w-36 rounded-md" />
        <div className="shimmer bg-[var(--border)] h-48 w-full rounded-lg" />
      </div>

      {/* Second chart skeleton */}
      <div className="card p-5 rounded-xl border border-[var(--border)] space-y-3">
        <div className="shimmer bg-[var(--border)] h-5 w-44 rounded-md" />
        <div className="shimmer bg-[var(--border)] h-40 w-full rounded-lg" />
      </div>
    </div>
  )
}
