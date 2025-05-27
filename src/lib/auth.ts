// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { db } from "../db";
import { sendEmail } from "../utils/email";
import { config } from "../config/environment";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: config.BETTER_AUTH_SECRET,
  baseURL: process.env.NODE_ENV === "production" 
    ? process.env.NEXT_PUBLIC_API_ENDPOINT 
    : "http://localhost:3001",
  trustedOrigins: [
    process.env.NODE_ENV === "production" 
      ? process.env.CORS_ORIGIN! 
      : "http://localhost:3000"
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8, // Minimum length for passwords
    autoSignIn: true, // Automatically sign in users after registration
    autoSignInAfterVerification: false,
    requireEmailVerification: false, // Disable for testing
    sendResetPassword: async ({ user, url }) => {
      console.log('Password reset requested for:', user.email);
      console.log('Reset URL:', url);

      // In development, log the URL
      if (config.NODE_ENV !== 'production') {
        console.log('🔗 Password reset link:', url);
        return; // Skip sending email in dev
      }

      if (config.RESEND_TOKEN) {
        await sendEmail({
          to: user.email,
          subject: "Reset Your Password",
          html: `
            <h1>Reset Your Password</h1>
            <p>Click <a href="${url}">here</a> to reset your password.</p>
            <p>This link will expire in 1 hour.</p>
          `
        });
      }
    }
  },

  emailVerification: {
    sendOnSignUp: false, // Disable for testing
    sendVerificationEmail: async ({ user, url, token }, request) => {
      console.log('Email verification for:', user.email);
      console.log('Verification URL:', url);
      
      // In development, log the URL
      if (config.NODE_ENV !== 'production') {
        console.log('🔗 Email verification link:', url);
        return; // Skip sending email in dev
      }
      
      if (config.RESEND_TOKEN) {
        await sendEmail({
          to: user.email,
          subject: "Verify Your Email",
          html: `
            <h1>Welcome to Raijin E-Sports!</h1>
            <p>Please verify your email by clicking <a href="${url}">here</a>.</p>
          `
        });
      }
    }
  },
  account: {
    accountLinking: {
      enabled: true, // Enable account linking
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (refresh session daily)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minute cache
    }
  },
  advanced: {
    crossSubDomainCookies: {
        enabled: true,
        domain: ".example.com", // Domain with a leading period
    },
    defaultCookieAttributes: {
        secure: true,
        httpOnly: true,
        sameSite: "none",  // Allows CORS-based cookie sharing across subdomains
        partitioned: true, // New browser standards will mandate this for foreign cookies
    },
  },
  plugins: [
    // twoFactor({
    //   issuer: "Raijin Ascendancy",
    //   totpOptions: {
    //     period: 30,
    //     digits: 6,
    //     algorithm: "SHA1"
    //   } as any
    // }),
    admin(),
    nextCookies()
  ],
});