// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { twoFactor } from "better-auth/plugins/two-factor"
import { admin } from "better-auth/plugins/admin"
import { db } from "../db"
import { 
  user, 
  session, 
  account, 
  verification, 
  twoFactorTable,
  roleTable,
  userRole
} from "../db/schema"
import { sendEmail } from "../utils/email"

console.log('Initializing Better-auth...');

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      twoFactor: twoFactorTable,
      role: roleTable,
      userRole
    }
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      console.log('Sending password reset email to:', user.email);
      // Send password reset email using your existing email service
      await sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Reset Your Password</h1>
            <p>You requested to reset your password for Scrim Platform.</p>
            <p>Please click the link below to reset your password:</p>
            <p>
              <a href="${url}" style="display: inline-block; background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                Reset Password
              </a>
            </p>
            <p>This link will expire in 30 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
          </div>
        `
      })
    }
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      console.log('Sending verification email to:', user.email);
      await sendEmail({
        to: user.email,
        subject: "Verify Your Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Welcome to Raijin E-Sports!</h1>
            <p>Hello ${user.name || user.email},</p>
            <p>Please verify your email address by clicking the link below:</p>
            <p>
              <a href="${url}" style="display: inline-block; background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                Verify Email
              </a>
            </p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        `
      })
    }
  },

  plugins: [
    twoFactor({
      issuer: "Raijin Ascendancy",
      totpOptions: {
        period: 30,
        digits: 6,
        algorithm: "SHA1"
      } as any
    }),
    admin()
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (refresh session daily)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minute cache
    }
  },

  user: {
    additionalFields: {
      profileImage: {
        type: "string",
        required: false
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "user"
      },
      isEmailVerified: {
        type: "boolean",
        required: false,
        defaultValue: false
      },
      twoFactorEnabled: {
        type: "boolean", 
        required: false,
        defaultValue: false
      }
    }
  },

  advanced: {
    generateId: () => crypto.randomUUID(),
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : 'localhost'
    },
    // Debug mode
    debug: process.env.NODE_ENV !== 'production'
  }
})

console.log('Better-auth initialized successfully');