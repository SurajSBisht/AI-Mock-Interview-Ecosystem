/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../services/authApi'
import type { Role, User } from '../types'

interface ApiUser {
  id: string
  fullName: string
  email: string
  role?: Role
  createdAt: string
  updatedAt?: string
  isVerified?: boolean
}

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  pendingVerificationEmail: string
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (fullName: string, email: string, password: string) => Promise<void>
  verifyOtp: (email: string, otp: string) => Promise<void>
  resendOtp: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_TOKEN_KEY = 'auth_token'
const PENDING_EMAIL_KEY = 'pending_verification_email'

function toUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    fullName: apiUser.fullName,
    email: apiUser.email,
    role: apiUser.role ?? 'candidate',
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt,
    isVerified: apiUser.isVerified,
  }
}

function storePendingEmail(email: string) {
  localStorage.setItem(PENDING_EMAIL_KEY, email)
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

function clearPendingEmail() {
  localStorage.removeItem(PENDING_EMAIL_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string>(() =>
    localStorage.getItem(PENDING_EMAIL_KEY) ?? '',
  )

  const setSession = useCallback((nextToken: string, nextUser: User) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    setToken(nextToken)
    setUser(nextUser)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    clearPendingEmail()
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    setPendingVerificationEmail('')
  }, [])

  useEffect(() => {
    const handleForcedLogout = () => {
      logout()
    }

    window.addEventListener('auth:logout', handleForcedLogout)

    return () => {
      window.removeEventListener('auth:logout', handleForcedLogout)
    }
  }, [logout])

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)

      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await authApi.get<{ user: ApiUser }>('/auth/me')
        const nextUser = toUser(response.data.user)

        setToken(storedToken)
        setUser(nextUser)
        setIsAuthenticated(true)
      } catch {
        logout()
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.post<{ token: string; user: ApiUser }>('/auth/login', {
      email,
      password,
    })

    setSession(response.data.token, toUser(response.data.user))
    clearPendingEmail()
    setPendingVerificationEmail('')
  }, [setSession])

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()

    await authApi.post('/auth/register', {
      fullName,
      email: normalizedEmail,
      password,
    })

    setPendingVerificationEmail(normalizedEmail)
    storePendingEmail(normalizedEmail)
  }, [])

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    const normalizedEmail = email.trim().toLowerCase()

    await authApi.post('/auth/verify-otp', {
      email: normalizedEmail,
      otp,
    })

    setPendingVerificationEmail(normalizedEmail)
    storePendingEmail(normalizedEmail)
  }, [])

  const resendOtp = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()

    await authApi.post('/auth/resend-otp', {
      email: normalizedEmail,
    })

    setPendingVerificationEmail(normalizedEmail)
    storePendingEmail(normalizedEmail)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      pendingVerificationEmail,
      login,
      logout,
      register,
      verifyOtp,
      resendOtp,
    }),
    [
      isAuthenticated,
      isLoading,
      login,
      logout,
      pendingVerificationEmail,
      register,
      resendOtp,
      token,
      user,
      verifyOtp,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
