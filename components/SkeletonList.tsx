export default function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-muted rounded-lg p-4 space-y-2 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-muted-foreground/20 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted-foreground/20 rounded w-2/3" />
              <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
