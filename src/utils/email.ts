// src/utils/email.ts
import { Resend } from 'resend';
import { config, isResendConfigured, isQStashConfigured } from '../config/environment';
import { getQStashClient } from './qstash';

let resendClient: Resend | null = null;

// Initialize Resend client
export const getResendClient = (): Resend | null => {
  if (!isResendConfigured()) {
    console.warn('Resend not configured. Email sending will not work.');
    return null;
  }
  
  if (!resendClient) {
    resendClient = new Resend(config.RESEND_TOKEN);
  }
  
  return resendClient;
};

export type EmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  metadata?: Record<string, any>;
};

// Send an email directly using Resend (used by the QStash handler)
export const sendEmailDirect = async (options: EmailOptions): Promise<string | null> => {
  const client = getResendClient();
  
  if (!client || !config.EMAIL_FROM_ADDRESS) {
    console.warn('Email sending skipped: Resend not configured');
    return null;
  }
  
  try {
    const response: any  = await client.emails.send({
      from: config.EMAIL_FROM_ADDRESS,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      tags: options.metadata ? [
        { name: 'source', value: 'scrim-platform' },
        ...Object.entries(options.metadata).map(([name, value]) => ({ 
          name, 
          value: String(value) 
        }))
      ] : [{ name: 'source', value: 'scrim-platform' }],
    });
    const id = response.id;
    
    console.log(`Email sent successfully: ${id}`);
    return id;
  } catch (error) {
    console.error('Failed to send email:', error);
    return null;
  }
};

// Queue an email to be sent asynchronously via QStash
export const sendEmail = async (options: EmailOptions): Promise<string | null> => {
  // If QStash is not configured, fall back to direct sending
  if (!isQStashConfigured()) {
    console.warn('QStash not configured, falling back to direct email sending');
    return sendEmailDirect(options);
  }
  
  const qstashClient = getQStashClient();
  if (!qstashClient) {
    console.warn('QStash client initialization failed, falling back to direct email sending');
    return sendEmailDirect(options);
  }
  
  try {
    // Queue the email job to QStash
    const response = await qstashClient.publishJSON({
      url: `${config.NODE_ENV === 'production' ? process.env.API_BASE_URL : 'http://localhost:' + config.PORT}/api/webhooks/email`,
      body: options,
      retries: 3, // Retry 3 times if sending fails
    });
    
    console.log(`Email queued successfully: ${response.messageId}`);
    return response.messageId;
  } catch (error) {
    console.error('Failed to queue email job:', error);
    // Fall back to direct sending on queue failure
    console.warn('Falling back to direct email sending');
    return sendEmailDirect(options);
  }
};

// Predefined email templates
export const emailTemplates = {
  welcome: (username: string) => ({
    subject: 'Welcome to Scrim Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Welcome to Scrim Platform!</h1>
        <p>Hello ${username},</p>
        <p>Thank you for joining Scrim Platform. We're excited to have you on board!</p>
        <p>Our platform helps gamers organize scrimmages, track performance, and improve their skills.</p>
        <p>Get started by:</p>
        <ul>
          <li>Creating or joining a team</li>
          <li>Setting up your first scrim</li>
          <li>Inviting your teammates</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Happy gaming!</p>
        <p>The Scrim Platform Team</p>
      </div>
    `,
    text: `Welcome to Scrim Platform!\n\nHello ${username},\n\nThank you for joining Scrim Platform. We're excited to have you on board!\n\nOur platform helps gamers organize scrimmages, track performance, and improve their skills.\n\nGet started by:\n- Creating or joining a team\n- Setting up your first scrim\n- Inviting your teammates\n\nIf you have any questions, feel free to reach out to our support team.\n\nHappy gaming!\n\nThe Scrim Platform Team`,
    metadata: {
      emailType: 'welcome',
      username
    }
  }),
  
  passwordReset: (resetLink: string, userId: number) => ({
    subject: 'Reset Your Scrim Platform Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password for Scrim Platform.</p>
        <p>Please click the link below to reset your password:</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>The Scrim Platform Team</p>
      </div>
    `,
    text: `Password Reset Request\n\nYou requested to reset your password for Scrim Platform.\n\nPlease visit the following link to reset your password:\n\n${resetLink}\n\nThis link will expire in 30 minutes.\n\nIf you didn't request a password reset, please ignore this email or contact support if you have concerns.\n\nThe Scrim Platform Team`,
    metadata: {
      emailType: 'passwordReset',
      userId
    }
  }),
  
  scrimInvitation: (teamName: string, scrimDetails: { id: number, title: string, date: string, game: string }, userId: number) => ({
    subject: `Invitation to join a scrim with ${teamName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Scrim Invitation</h1>
        <p>You've been invited to participate in a scrim with ${teamName}!</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="margin-top: 0;">${scrimDetails.title}</h2>
          <p><strong>Game:</strong> ${scrimDetails.game}</p>
          <p><strong>Date & Time:</strong> ${scrimDetails.date}</p>
        </div>
        <p>Log in to the Scrim Platform to accept this invitation and see more details.</p>
        <p>Good luck and have fun!</p>
        <p>The Scrim Platform Team</p>
      </div>
    `,
    text: `Scrim Invitation\n\nYou've been invited to participate in a scrim with ${teamName}!\n\n${scrimDetails.title}\nGame: ${scrimDetails.game}\nDate & Time: ${scrimDetails.date}\n\nLog in to the Scrim Platform to accept this invitation and see more details.\n\nGood luck and have fun!\n\nThe Scrim Platform Team`,
    metadata: {
      emailType: 'scrimInvitation',
      userId,
      scrimId: scrimDetails.id,
      teamName
    }
  }),
};