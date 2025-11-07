export default function PostLoading() {
  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24">
      <div className="article-container px-4 sm:px-6">
        {/* Header Skeleton */}
        <header className="py-8 md:py-12">
          {/* Category badge skeleton */}
          <div className="h-6 bg-gray-200 rounded-full w-24 mb-4 animate-pulse" />

          {/* Title skeleton */}
          <div className="space-y-3 mb-6">
            <div className="h-12 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-12 bg-gray-200 rounded animate-pulse w-4/5" />
          </div>

          {/* Summary skeleton */}
          <div className="space-y-2 mb-8">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
          </div>

          {/* Author info skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-48" />
            </div>
          </div>
        </header>

        {/* Cover Image skeleton */}
        <div className="mb-12 -mx-4 sm:-mx-6 md:mx-0 md:rounded-lg overflow-hidden">
          <div className="w-full h-96 bg-gray-200 animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="blog-content space-y-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
          <div className="h-40 bg-gray-200 rounded animate-pulse w-full mt-8" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
          <div className="h-40 bg-gray-200 rounded animate-pulse w-full mt-8" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
        </div>

        {/* Loading indicator */}
        <div className="fixed bottom-8 right-8 bg-white shadow-lg rounded-full p-4 border-2 border-green-500">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">로딩 중...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
