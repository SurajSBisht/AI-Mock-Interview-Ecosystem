import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { ThemeToggle } from '../components/shared/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { verifyOtpSchema, type VerifyOtpFormData } from '../schemas/authSchemas'
import { getApiErrorMessage } from '../utils/apiError'

export function VerifyOtp() {
  const { verifyOtp, resendOtp, isAuthenticated, isLoading, pendingVerificationEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const locationEmail = (location.state as { email?: string } | null)?.email ?? ''
  const email = locationEmail || pendingVerificationEmail

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email },
  })

  useEffect(() => {
    if (email) {
      reset({ email, otp: '' })
    }
  }, [email, reset])

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data: VerifyOtpFormData) => {
    setIsSubmitting(true)
    try {
      await verifyOtp(data.email, data.otp)
      toast.success('Email verified. You can sign in now.')
      navigate('/login', { replace: true, state: { email: data.email } })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'OTP verification failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      toast.error('Enter your email first')
      return
    }

    setIsResending(true)
    try {
      await resendOtp(email)
      toast.success('A new OTP has been sent')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not resend OTP'))
    } finally {
      setIsResending(false)
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
              Verify Your Email
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Enter the 6-digit OTP we sent to your email to activate your account.
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
              label="OTP Code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              error={errors.otp?.message}
              {...register('otp')}
            />

            <Button type="submit" className="w-full" isLoading={isLoading || isSubmitting}>
              Verify OTP
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleResend}
              isLoading={isResending}
            >
              Resend OTP
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already verified?{' '}
            <Link to="/login" className="font-medium text-primary">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
