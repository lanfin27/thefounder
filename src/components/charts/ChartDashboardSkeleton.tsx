export default function ChartDashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Controls skeleton */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Time range skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-5 bg-gray-200 rounded w-12"></div>
            <div className="h-10 bg-gray-200 rounded w-64"></div>
          </div>
          
          {/* Sort skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-5 bg-gray-200 rounded w-12"></div>
            <div className="h-10 bg-gray-200 rounded w-48"></div>
          </div>
          
          {/* Size skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-5 bg-gray-200 rounded w-12"></div>
            <div className="h-10 bg-gray-200 rounded w-36"></div>
          </div>
        </div>
      </div>

      {/* Chart grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(12)].map((_, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-100 p-4">
            {/* Header */}
            <div className="mb-3">
              <div className="flex items-start justify-between mb-2">
                <div className="h-5 bg-gray-200 rounded w-24"></div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-8"></div>
                </div>
              </div>
              
              {/* Value and change */}
              <div className="flex items-baseline gap-3">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="h-5 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </div>
            
            {/* Chart area */}
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="mt-4 text-center">
        <div className="h-3 bg-gray-200 rounded w-48 mx-auto"></div>
      </div>
    </div>
  )
}