export default function CompactChartSkeleton() {
  return (
    <div className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-2xl p-8 border border-green-100">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Market summary skeleton */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-8"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>

        {/* Chart grid skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-16 bg-gray-200 rounded mb-3"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-12"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA skeleton */}
        <div className="text-center pt-6 border-t border-green-200/50">
          <div className="h-5 bg-gray-200 rounded w-80 mx-auto mb-4"></div>
          <div className="flex gap-3 justify-center max-w-md mx-auto">
            <div className="h-12 bg-gray-200 rounded-lg flex-1"></div>
            <div className="h-12 bg-gray-200 rounded-lg flex-1"></div>
          </div>
        </div>
      </div>
    </div>
  )
}