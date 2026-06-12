import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, type = 'text', ...rest }, ref) => {
    return (
      <div>
        {label ? (
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
            className,
          )}
          {...rest}
        />
        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      </div>
    )
  },
)

Input.displayName = 'Input'
