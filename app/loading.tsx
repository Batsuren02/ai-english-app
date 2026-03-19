export default function DashboardLoading() {
  return (
    <div className="space-y-6 fade-in">
      {/* Hero skeleton */}
      <div className="rounded-2xl shimmer" style={{ height: 96, background: 'var(--border)' }} />

      {/* Bento stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 rounded-2xl shimmer flex flex-col justify-between p-5" style={{ minHeight: 120, background: 'var(--border)' }}>
          <div className="h-3 w-20 rounded shimmer" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
          <div className="h-10 w-16 rounded-lg shimmer" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl shimmer flex flex-col justify-between p-5" style={{ minHeight: 120, background: 'var(--border)' }}>
            <div className="h-3 w-14 rounded shimmer" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
            <div className="h-9 w-12 rounded-lg shimmer" style={{ background: 'color-mix(in srgb, var(--border) 80%, var(--surface))' }} />
          </div>
        ))}
      </div>

      {/* Level card skeleton */}
      <div className="rounded-2xl border border-[var(--border)] p-5 space-y-3" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg shimmer" style={{ background: 'var(--border)' }} />
            <div className="space-y-1.5">
              <div className="h-3 w-28 rounded shimmer" style={{ background: 'var(--border)' }} />
              <div className="h-2.5 w-36 rounded shimmer" style={{ background: 'var(--border)' }} />
            </div>
          </div>
          <div className="h-3 w-10 rounded shimmer" style={{ background: 'var(--border)' }} />
        </div>
        <div className="w-full h-2 rounded-full shimmer" style={{ background: 'var(--border)' }} />
      </div>

      {/* Practice cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 flex items-center gap-3 border-l-4" style={{ borderLeftColor: 'var(--border)' }}>
            <div className="w-8 h-8 rounded-lg shimmer flex-shrink-0" style={{ background: 'var(--border)' }} />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-14 rounded shimmer" style={{ background: 'var(--border)' }} />
              <div className="h-2.5 w-20 rounded shimmer" style={{ background: 'var(--border)' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Activity chart skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 rounded shimmer" style={{ background: 'var(--border)' }} />
          <div className="h-3 w-20 rounded shimmer" style={{ background: 'var(--border)' }} />
        </div>
        <div className="flex items-end gap-2 h-16">
          {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full rounded-sm shimmer" style={{ height: `${h}%`, background: 'var(--border)' }} />
              <div className="h-2 w-6 rounded shimmer" style={{ background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
