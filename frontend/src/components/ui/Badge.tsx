import { cn } from '../../utils/cn'

interface BadgeProps {
  label: string
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  success:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  warning:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
      )}
    >
      {label}
    </span>
  )
}
