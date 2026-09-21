export default function SkeletonLoader({ className = '', variant = 'chart' }: { className?: string; variant?: 'chart' | 'bar' | 'donut' | 'kpi' }) {
  if (variant === 'kpi') {
    return (
      <div className={`skeleton h-24 ${className}`} />
    )
  }
  if (variant === 'bar') {
    return (
      <div className={`${className} p-4`}>
        <div className="skeleton h-4 w-1/3 mb-4" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (variant === 'donut') {
    return (
      <div className={`${className} p-4 flex flex-col items-center`}>
        <div className="skeleton h-4 w-1/3 mb-4" />
        <div className="skeleton w-32 h-32 rounded-full" />
        <div className="flex gap-4 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-3 w-16" />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className={`${className}`}>
      <div className="skeleton h-4 w-1/4 mb-3" />
      <div className="skeleton h-4 w-1/3 mb-4" />
      <div className="skeleton h-48 w-full" />
    </div>
  )
}
