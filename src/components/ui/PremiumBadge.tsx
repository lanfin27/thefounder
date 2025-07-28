import { Crown, Lock } from 'lucide-react'

interface PremiumBadgeProps {
  variant?: 'default' | 'small' | 'inline'
  showLock?: boolean
  className?: string
}

export default function PremiumBadge({ 
  variant = 'default', 
  showLock = false,
  className = '' 
}: PremiumBadgeProps) {
  const Icon = showLock ? Lock : Crown

  if (variant === 'small') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border border-orange-200 ${className}`}>
        <Icon className="w-3 h-3" />
        Premium
      </span>
    )
  }

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 text-orange-600 ${className}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">프리미엄</span>
      </span>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 ${className}`}>
      <Icon className="w-4 h-4 text-orange-600" />
      <span className="text-sm font-semibold text-orange-800">프리미엄 콘텐츠</span>
    </div>
  )
}