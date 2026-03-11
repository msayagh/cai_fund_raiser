'use strict';

const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const googleSignInSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

const bootstrapAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

const completeRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  pledge: z
    .object({
      totalPledge: z.number().positive('Pledge amount must be positive'),
      endDate: z.string().datetime({ offset: true }).optional(),
    })
    .optional(),
  payments: z
    .array(
      z.object({
        amount: z.number().positive(),
        date: z.string().datetime({ offset: true }),
        method: z.enum(['zeffy', 'cash', 'other']),
        note: z.string().max(500).optional(),
      })
    )
    .optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6).regex(/^\d{6}$/),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

module.exports = {
  loginSchema,
  googleSignInSchema,
  bootstrapAdminSchema,
  sendOtpSchema,
  verifyOtpSchema,
  completeRegistrationSchema,
  resetPasswordSchema,
  refreshSchema,
  logoutSchema,
};
