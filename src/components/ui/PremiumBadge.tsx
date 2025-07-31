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
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-medium-green text-white ${className}`}>
        <Icon className="w-3 h-3" />
        Premium
      </span>
    )
  }

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 text-medium-green ${className}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">프리미엄</span>
      </span>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-medium-green text-white ${className}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">프리미엄 콘텐츠</span>
    </div>
  )
}