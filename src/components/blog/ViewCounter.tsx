import { Eye } from 'lucide-react'
import { getPostMetrics } from '@/lib/analytics/service'

interface ViewCounterProps {
  postId: string
  className?: string
}

export default async function ViewCounter({ postId, className = '' }: ViewCounterProps) {
  const metrics = await getPostMetrics(postId)

  return (
    <div className={`flex items-center gap-1.5 text-sm text-gray-500 ${className}`}>
      <Eye className="w-4 h-4" />
      <span>{metrics.totalViews.toLocaleString('ko-KR')}회 조회</span>
    </div>
  )
}