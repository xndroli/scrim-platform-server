// src/lib/auth.ts
import { betterAuth } from "better-auth";
// import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
// import { twoFactor } from "better-auth/plugins/two-factor";
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

console.log('🔧 Initializing Better-auth...');

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // schema: {
    //   user,
    //   session,
    //   account,
    //   verification,
    //   // twoFactor: twoFactorTable,
    //   // role: roleTable,
    //   // userRole
    // }
  }),
  // Secret key (must be at least 32 characters)
  secret: config.BETTER_AUTH_SECRET,
  // Base URL for redirects and callbacks
  baseURL: config.NODE_ENV === 'production' 
    ? process.env.BETTER_AUTH_URL
    : 'http://localhost:3001',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable for testing
    // sendResetPassword: async ({ user, url }) => {
    //   console.log('📧 Password reset requested for:', user.email);

    //   // In development, log the URL
    //   if (config.NODE_ENV !== 'development') {
    //     console.log('🔗 Password reset link (DEV):', url);
    //     return; // Skip sending email in dev
    //   }

    //   // In production, send email if configured
    //   if (config.RESEND_TOKEN && config.EMAIL_FROM_ADDRESS) {
    //     try {
    //       await sendEmail({
    //         to: user.email,
    //         subject: "Reset Your Password",
    //         html: `
    //           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    //             <h1>Reset Your Password</h1>
    //             <p>Hello ${user.name},</p>
    //             <p>Click the link below to reset your password:</p>
    //             <p><a href="${url}" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
    //             <p>This link will expire in 1 hour.</p>
    //             <p>If you didn't request this, please ignore this email.</p>
    //           </div>
    //         `
    //       });
    //       console.log('✅ Password reset email sent to:', user.email);
    //     } catch (error) {
    //       console.error('❌ Failed to send password reset email:', error);
    //     }
    //   }
    // }
  },

  emailVerification: {
    sendOnSignUp: false, // Disable for testing
    sendVerificationEmail: async ({ user, url }) => {
      console.log('📧 Email verification for:', user.email);

      if (config.NODE_ENV === 'development') {
        console.log('🔗 Email verification link (DEV):', url);
        return;
      }
      
      // In production, send email if configured
      if (config.RESEND_TOKEN && config.EMAIL_FROM_ADDRESS) {
        try {
          await sendEmail({
            to: user.email,
            subject: "Verify Your Email - Raijin Ascendancy",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>Welcome to Raijin Ascendancy!</h1>
                <p>Hello ${user.name},</p>
                <p>Please verify your email by clicking the link below:</p>
                <p><a href="${url}" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
                <p>This link will expire in 24 hours.</p>
              </div>
            `
          });
          console.log('✅ Verification email sent to:', user.email);
        } catch (error) {
          console.error('❌ Failed to send verification email:', error);
        }
      }
    }
  },

  socialProviders: {
    discord: {
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!
    }
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
    // admin(),
    // nextCookies()
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (refresh session daily)
    // cookieCache: {
    //   enabled: true,
    //   maxAge: 60 * 5 // 5 minute cache
    // }
  },

  // According to docs, trustedOrigins goes at root level
  trustedOrigins: [
    "http://localhost:3000", 
    "https://scrim-platform-client.vercel.app",
    config.CORS_ORIGIN,
    config.CORS_ORIGIN_1
  ].filter(Boolean),

  // advanced: {
  //   // Secret must be at least 32 characters
  //   useSecureCookies: config.NODE_ENV === "production",
  //   cookiePrefix: "better-auth",
  //   crossSubDomainCookies: {
  //     enabled: config.NODE_ENV === "production" // Enable only in production
  //   }
  // },
  // Callbacks for debugging
  callbacks: {
    async signIn({ user, session }: any) {
      console.log('✅ User signed in:', user.email);
      return true;
    },
    async signUp({ user }: any) {
      console.log('✅ User signed up:', user.email);
      return true;
    }
  }
});

console.log('✅ Better-auth initialized successfully');

// Export types for TypeScript
export type Session = typeof auth.$Infer.Session;

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