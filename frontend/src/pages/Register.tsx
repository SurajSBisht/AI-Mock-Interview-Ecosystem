import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { ThemeToggle } from '../components/shared/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import {
  registerSchema,
  type RegisterFormData,
} from '../schemas/authSchemas'
import { cn } from '../utils/cn'

export function Register() {
  const { register: registerUser, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.fullName, data.email, data.password, data.role)
      toast.success('Account created!')
      navigate('/dashboard')
    } catch {
      toast.error('Registration failed')
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
              Create Account
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Join AMIE and start practicing
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Full Name"
              placeholder="Your full name"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
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
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                I am a...
              </label>
              <select
                className={cn(
                  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800',
                )}
                {...register('role')}
              >
                <option value="candidate">Candidate</option>
                <option value="coach">Coach</option>
                <option value="placement_officer">Placement Officer</option>
              </select>
              {errors.role ? (
                <p className="mt-1 text-xs text-danger">{errors.role.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
