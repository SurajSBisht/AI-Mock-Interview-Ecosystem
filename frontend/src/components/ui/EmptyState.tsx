import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
      <h3 className="font-medium text-gray-600 dark:text-gray-400">{title}</h3>
      <p className="mt-1 text-sm text-gray-400">{message}</p>
      {actionLabel && onAction ? (
        <Button variant="primary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
