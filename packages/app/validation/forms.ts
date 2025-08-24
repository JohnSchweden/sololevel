import { z } from 'zod'
import { EmailSchema, PasswordSchema, UsernameSchema } from './common'

// Authentication form schemas
export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const SignUpSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: z.string(),
    username: UsernameSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
})

export const ResetPasswordSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: z.string(),
    token: z.string().min(1, 'Reset token is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

// User profile form schemas
export const UpdateProfileSchema = z.object({
  username: UsernameSchema.optional(),
  firstName: z.string().min(1, 'First name is required').max(50).optional(),
  lastName: z.string().min(1, 'Last name is required').max(50).optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
})

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

// Search and filter form schemas
export const SearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
  filters: z.record(z.string(), z.any()).optional(),
})

export const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: EmailSchema,
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
})

// Export types for form data
export type SignInData = z.infer<typeof SignInSchema>
export type SignUpData = z.infer<typeof SignUpSchema>
export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>
export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>
export type SearchData = z.infer<typeof SearchSchema>
export type ContactFormData = z.infer<typeof ContactFormSchema>
