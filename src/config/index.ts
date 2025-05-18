import { environment } from './environment';

export const config = {
  server: {
    port: parseInt(environment.PORT, 10),
    nodeEnv: environment.NODE_ENV,
  },
  database: {
    url: environment.DATABASE_URL,
  },
  auth: {
    jwtSecret: environment.JWT_SECRET,
    jwtExpiresIn: environment.JWT_EXPIRES_IN,
  },
  redis: {
    url: environment.UPSTASH_REDIS_URL,
    token: environment.UPSTASH_REDIS_TOKEN,
  },
  qstash: {
    url: environment.QSTASH_URL,
    token: environment.QSTASH_TOKEN,
  },
  email: {
    resendToken: environment.RESEND_TOKEN,
  },
  cors: {
    origin: environment.CORS_ORIGIN,
  },
};
