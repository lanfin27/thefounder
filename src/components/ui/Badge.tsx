import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--surface-100)] text-[var(--ink-700)]',
        primary: 'bg-gray-900 text-white',
        success: 'bg-[var(--success-light)] text-[var(--success)]',
        warning: 'bg-[var(--warning-light)] text-[var(--warning)]',
        error: 'bg-[var(--error-light)] text-[var(--error)]',
        info: 'bg-[var(--info-light)] text-[var(--info)]',
        green: 'bg-[var(--primary-100)] text-[var(--primary-700)]',
        outline: 'border border-[var(--border-200)] text-[var(--ink-700)]',
        subtle: 'bg-[var(--surface-50)] text-[var(--ink-500)]',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs rounded-full',
        md: 'px-2.5 py-1 text-sm rounded-full',
        lg: 'px-3 py-1.5 text-base rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
export default Badge