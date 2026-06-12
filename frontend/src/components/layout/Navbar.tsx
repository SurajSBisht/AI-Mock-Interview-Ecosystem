import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '../ui/Badge'
import { ThemeToggle } from '../shared/ThemeToggle'
import { cn } from '../../utils/cn'
import { toast } from 'react-hot-toast'

function formatRole(role: string) {
  return role.replace(/_/g, ' ')
}

export function Navbar() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    toast.success('Logged out successfully')
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <Link to="/dashboard" className="text-2xl font-bold text-primary">
        AMIE
      </Link>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <button
          type="button"
          className="relative rounded-full p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-xs text-white">
            3
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {user?.fullName?.charAt(0) ?? 'U'}
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user?.fullName ?? 'User'}
                </p>
              </div>
              {user ? <Badge label={formatRole(user.role)} /> : null}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500 md:hidden" />
          </button>

          {isOpen ? (
            <div
              className={cn(
                'absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900',
              )}
            >
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                onClick={() => setIsOpen(false)}
              >
                <UserIcon className="h-4 w-4" />
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
