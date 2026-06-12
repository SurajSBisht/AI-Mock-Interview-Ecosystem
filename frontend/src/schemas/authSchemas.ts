import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
})

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Min 2 characters'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Min 6 characters'),
    confirmPassword: z.string(),
    role: z.enum(['candidate', 'coach', 'placement_officer']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
