export default function SkeletonChart() {
  return (
    <div className="bg-muted rounded-lg p-4 space-y-4 animate-pulse">
      <div className="h-6 bg-muted-foreground/20 rounded w-1/3" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted-foreground/20 rounded" />
        ))}
      </div>
    </div>
  )
}
