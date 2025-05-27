// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins/two-factor";
import { admin } from "better-auth/plugins/admin";
import { db } from "../db";
import { 
  user, 
  session, 
  account, 
  verification, 
  // twoFactorTable,
  // roleTable,
  // userRole
} from "../db/schema";
import { sendEmail } from "../utils/email";
import { config } from "../config/environment";


console.log('Initializing Better-auth...');

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      // twoFactor: twoFactorTable,
      // role: roleTable,
      // userRole
    }
  }),
  
  emailAndPassword: {
    enabled: true,
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

    sendVerificationEmail: async ({ user, url }) => {
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

  plugins: [
    twoFactor({
      issuer: "Raijin Ascendancy",
      totpOptions: {
        period: 30,
        digits: 6,
        algorithm: "SHA1"
      } as any
    }),
    admin(),
    nextCookies()
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (refresh session daily)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minute cache
    }
  },

  // According to docs, trustedOrigins goes at root level
  trustedOrigins: [
    "http://localhost:3000", // Next.js dev server
    ...(config.CORS_ORIGIN ? [config.CORS_ORIGIN] : []),
    ...(config.CORS_ORIGIN_1 ? [config.CORS_ORIGIN_1] : [])
  ],

  advanced: {
    // Secret must be at least 32 characters
    useSecureCookies: config.NODE_ENV === "production",
    cookiePrefix: "better-auth",
    generateId: () => crypto.randomUUID(),
    // According to docs, crossSubDomainCookies is a separate config
    crossSubDomainCookies: {
      enabled: true // Disable for localhost development
    }
  },
  
  // Add the secret at root level (some versions expect it here)
  secret: config.BETTER_AUTH_SECRET
});

  // user: {
  //   additionalFields: {
  //     profileImage: {
  //       type: "string",
  //       required: false
  //     },
  //     role: {
  //       type: "string",
  //       required: false,
  //       defaultValue: "user"
  //     },
  //     isEmailVerified: {
  //       type: "boolean",
  //       required: false,
  //       defaultValue: false
  //     },
  //     twoFactorEnabled: {
  //       type: "boolean", 
  //       required: false,
  //       defaultValue: false
  //     }
  //   }
  // },

//   advanced: {
//     generateId: () => crypto.randomUUID(),
//     crossSubDomainCookies: {
//       enabled: true,
//       domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : 'localhost'
//     },
//     // Debug mode
//     debug: process.env.NODE_ENV !== 'production'
//   }
// })