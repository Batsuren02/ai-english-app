export default function PronunciationLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="shimmer bg-[var(--border)] h-8 w-52 rounded-md" />
        <div className="shimmer bg-[var(--border)] h-4 w-60 rounded-sm" />
      </div>

      {/* Search bar */}
      <div className="shimmer bg-[var(--border)] h-11 w-full rounded-xl" />

      {/* Word list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="shimmer bg-[var(--border)] h-5 w-32 rounded-md" />
            <div className="shimmer bg-[var(--border)] h-3 w-48 rounded-sm" />
            <div className="shimmer bg-[var(--border)] h-3 w-20 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
