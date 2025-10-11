export default function CompactChartSkeletonToss() {
  return (
    <div className="w-full">
      {/* Header skeleton - Toss style */}
      <div className="flex items-center justify-between mb-8 animate-pulse">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-24"></div>
      </div>

      {/* Chart grid skeleton - Toss style */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-5 animate-pulse">
            {/* Card header */}
            <div className="mb-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
            
            {/* Value and badge */}
            <div className="flex items-baseline gap-3 mb-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
            </div>
            
            {/* Chart area */}
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Market summary skeleton - Toss style */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    </div>
  )
}