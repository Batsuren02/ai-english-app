export default function ReadingLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="shimmer bg-[var(--border)] h-8 w-44 rounded-md" />
        <div className="shimmer bg-[var(--border)] h-4 w-64 rounded-sm" />
      </div>

      {/* Text input card */}
      <div className="card p-6 space-y-4">
        <div className="shimmer bg-[var(--border)] h-4 w-28 rounded-sm" />
        <div className="shimmer bg-[var(--border)] h-[240px] w-full rounded-xl" />
        <div className="shimmer bg-[var(--border)] h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
