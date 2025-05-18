import { Client as QStashClient, resend } from '@upstash/qstash';
import { config } from '../config';
import { logger } from './logger';

const qstashClient = new QStashClient({ token: config.qstash.token });

type EmailParams = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export const sendEmail = async (params: EmailParams) => {
  try {
    const { to, subject, text, html } = params;
    
    await qstashClient.publishJSON({
      api: {
        name: 'email',
        provider: resend({ token: config.email.resendToken }),
      },
      body: {
        from: 'Raijin <contact@raijinascendancy.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        html: html || text,
      },
    });
    
    logger.info(`Email sent to ${to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
};
