// src/utils/qstash.ts
import { Client } from '@upstash/qstash';
import { config, isQStashConfigured } from '../config/environment';

let qstashClient: Client | null = null;

// Initialize QStash client
export const getQStashClient = (): Client | null => {
  if (!isQStashConfigured()) {
    console.warn('QStash not configured. Async job processing will not work.');
    return null;
  }
  
  if (!qstashClient) {
    qstashClient = new Client({
      token: config.QSTASH_TOKEN!,
    });
  }
  
  return qstashClient;
};

// Send a message to QStash
export const publishMessage = async <T>(
  destination: string,
  body: T,
  options?: { delay?: number }
): Promise<string | null> => {
  const client = getQStashClient();
  
  if (!client) {
    return null;
  }
  
  try {
    const response = await client.publishJSON({
      url: destination,
      body,
      delay: options?.delay,
    });
    
    return response.messageId;
  } catch (error) {
    console.error('❌ Failed to publish message to QStash:', error);
    return null;
  }
};