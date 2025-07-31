export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-medium-green border-t-transparent"></div>
      <span className="ml-3 text-body text-medium-black-secondary">로딩 중...</span>
    </div>
  )
}