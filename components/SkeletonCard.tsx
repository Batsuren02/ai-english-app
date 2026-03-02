export default function SkeletonCard() {
  return (
    <div className="bg-muted rounded-lg p-4 space-y-3 animate-pulse">
      <div className="h-6 bg-muted-foreground/20 rounded w-3/4" />
      <div className="space-y-2">
        <div className="h-4 bg-muted-foreground/20 rounded w-full" />
        <div className="h-4 bg-muted-foreground/20 rounded w-5/6" />
      </div>
      <div className="h-10 bg-muted-foreground/20 rounded mt-4" />
    </div>
  )
}
