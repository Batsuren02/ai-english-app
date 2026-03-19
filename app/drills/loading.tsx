export default function DrillsLoading() {
  return (
    <div className="max-w-[600px] mx-auto space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <div className="shimmer bg-[var(--border)] h-8 w-48 rounded-md" />
        <div className="shimmer bg-[var(--border)] h-4 w-56 rounded-sm" />
      </div>

      {/* Config card */}
      <div className="card p-6 space-y-6">
        <div className="shimmer bg-[var(--border)] h-5 w-44 rounded-md" />

        {/* Slider rows */}
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="shimmer bg-[var(--border)] h-4 w-40 rounded-sm" />
              <div className="shimmer bg-[var(--border)] h-4 w-10 rounded-sm" />
            </div>
            <div className="shimmer bg-[var(--border)] h-2 w-full rounded-full" />
          </div>
        ))}

        {/* Toggle row */}
        <div className="flex items-center gap-3">
          <div className="shimmer bg-[var(--border)] h-6 w-10 rounded-full" />
          <div className="space-y-1">
            <div className="shimmer bg-[var(--border)] h-4 w-36 rounded-sm" />
            <div className="shimmer bg-[var(--border)] h-3 w-52 rounded-sm" />
          </div>
        </div>

        {/* Start button */}
        <div className="shimmer bg-[var(--border)] h-11 w-full rounded-xl" />
      </div>
    </div>
  )
}
