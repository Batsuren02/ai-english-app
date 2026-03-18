import { SkeletonFlashcard } from '@/components/design/Skeleton'

export default function WritingLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="shimmer bg-[var(--border)] h-7 w-48 rounded-md" />
        <div className="shimmer bg-[var(--border)] h-4 w-64 rounded-sm" />
      </div>
      <SkeletonFlashcard className="min-h-[200px]" />
      <div className="space-y-3">
        <div className="shimmer bg-[var(--border)] h-24 w-full rounded-xl" />
        <div className="shimmer bg-[var(--border)] h-10 w-full rounded-lg" />
      </div>
    </div>
  )
}
