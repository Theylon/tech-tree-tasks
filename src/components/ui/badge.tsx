import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-amber-600 text-white',
        secondary: 'border-transparent bg-gray-200 text-gray-900',
        destructive: 'border-transparent bg-red-600 text-white',
        outline: 'text-gray-900 border-gray-300',
        success: 'border-transparent bg-green-600 text-white',
        warning: 'border-transparent bg-yellow-500 text-white',
        small: 'border-transparent bg-green-100 text-green-700',
        medium: 'border-transparent bg-yellow-100 text-yellow-700',
        large: 'border-transparent bg-red-100 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
