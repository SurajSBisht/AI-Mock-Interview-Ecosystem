import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutDashboard,
  Settings,
  Video,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../types'
import { cn } from '../../utils/cn'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  allowedRoles: Role[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    allowedRoles: ['candidate', 'coach', 'placement_officer', 'admin'],
  },
  {
    label: 'Interview',
    path: '/interview',
    icon: Video,
    allowedRoles: ['candidate'],
  },
  {
    label: 'Practice Plan',
    path: '/practice-plan',
    icon: BookOpen,
    allowedRoles: ['candidate'],
  },
  {
    label: 'Question Bank',
    path: '/questions',
    icon: Database,
    allowedRoles: ['coach', 'admin'],
  },
  {
    label: 'Notifications',
    path: '/notifications',
    icon: Bell,
    allowedRoles: ['candidate', 'coach', 'placement_officer', 'admin'],
  },
  {
    label: 'Admin Panel',
    path: '/admin',
    icon: Settings,
    allowedRoles: ['admin'],
  },
]

export function Sidebar() {
  const { user } = useAuth()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isCollapsed))
  }, [isCollapsed])

  const visibleItems = navItems.filter((item) => {
    return user ? item.allowedRoles.includes(user.role) : false
  })

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen flex-col border-r border-gray-200 bg-white pt-4 transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 md:flex',
        isCollapsed ? 'w-16' : 'w-56',
      )}
    >
      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`)

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                isActive
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed ? <span>{item.label}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-200 p-3 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          className="flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  )
}
