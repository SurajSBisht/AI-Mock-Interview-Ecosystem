/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { MOCK_TOKEN } from '../utils/constants'
import { mockUser } from '../utils/mockData'
import type { Role, User } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (
    fullName: string,
    email: string,
    password: string,
    role: Role,
  ) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getRoleFromEmail(email: string): Role {
  const normalizedEmail = email.toLowerCase()

  if (normalizedEmail.includes('admin')) {
    return 'admin'
  }

  if (normalizedEmail.includes('coach')) {
    return 'coach'
  }

  if (normalizedEmail.includes('officer')) {
    return 'placement_officer'
  }

  return 'candidate'
}

function createMockUser(role: Role, email?: string, fullName?: string): User {
  return {
    ...mockUser,
    id: `user-${Date.now()}`,
    fullName: fullName ?? mockUser.fullName,
    email: email ?? mockUser.email,
    role,
    createdAt: new Date().toISOString(),
  }
}

function readStoredRole(): Role {
  const storedRole = localStorage.getItem('userRole')

  if (
    storedRole === 'candidate' ||
    storedRole === 'coach' ||
    storedRole === 'placement_officer' ||
    storedRole === 'admin'
  ) {
    return storedRole
  }

  return 'candidate'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token'),
  )
  const [user, setUser] = useState<User | null>(() => {
    const storedToken = localStorage.getItem('token')

    if (!storedToken) {
      return null
    }

    return createMockUser(readStoredRole())
  })
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem('token')),
  )
  const [isLoading, setIsLoading] = useState(false)

  const login = async (email: string, password: string) => {
    void password
    setIsLoading(true)
    await sleep(1000)

    const role = getRoleFromEmail(email)
    const sessionUser = createMockUser(role, email)

    localStorage.setItem('token', MOCK_TOKEN)
    localStorage.setItem('userRole', role)
    setUser(sessionUser)
    setToken(MOCK_TOKEN)
    setIsAuthenticated(true)
    setIsLoading(false)
  }

  const register = async (
    fullName: string,
    email: string,
    password: string,
    role: Role,
  ) => {
    void password
    setIsLoading(true)
    await sleep(1000)

    const sessionUser: User = {
      id: `user-${Date.now()}`,
      fullName,
      email,
      role,
      avatarUrl: mockUser.avatarUrl,
      createdAt: new Date().toISOString(),
    }

    localStorage.setItem('token', MOCK_TOKEN)
    localStorage.setItem('userRole', role)
    setUser(sessionUser)
    setToken(MOCK_TOKEN)
    setIsAuthenticated(true)
    setIsLoading(false)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
