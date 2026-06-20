import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { ThemeToggle } from '../components/shared/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { loginSchema, type LoginFormData } from '../schemas/authSchemas'
import { getApiErrorMessage } from '../utils/apiError'

export function Login() {
  const { login, isAuthenticated, isLoading, pendingVerificationEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const locationEmail = (location.state as { email?: string } | null)?.email ?? ''
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: locationEmail || pendingVerificationEmail },
  })

  useEffect(() => {
    const nextEmail = locationEmail || pendingVerificationEmail
    if (nextEmail) {
      reset({ email: nextEmail, password: '' })
    }
  }, [locationEmail, pendingVerificationEmail, reset])

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    try {
      await login(data.email, data.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid credentials'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-primary">AMIE</h1>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Sign in to your account
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full" isLoading={isLoading || isSubmitting}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-primary">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
