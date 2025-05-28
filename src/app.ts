import express from 'express';
import cors from 'cors';
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from './lib/auth';
import helmet from 'helmet';
import { config } from './config/environment';
import { routes } from './api/routes';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './api/middleware/error.middleware';

// Create Express app
const app = express();

// Trust proxy for production (Railway, Vercel, etc.)
app.set('trust proxy', 1);

// Cookie parsing
app.use(cookieParser());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration - FIXED
const allowedOrigins = [
  'http://localhost:3000',
  'https://scrim-platform-client.vercel.app',
  config.CORS_ORIGIN,
  config.CORS_ORIGIN_1,
].filter(Boolean);

console.log('🌐 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    console.log('🔍 CORS check for origin:', origin);
    
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      console.log('✅ No origin - allowing request');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        // Handle wildcard patterns like *.vercel.app
        const pattern = allowedOrigin.replace('*', '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      console.log('✅ Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      console.log('📋 Allowed origins:', allowedOrigins);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cookie',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['set-cookie'],
  optionsSuccessStatus: 200, // For legacy browser support
}));

// Auth routes
app.all("/api/auth/*", toNodeHandler(auth)); // For ExpressJS v4
// app.all("/api/auth/*splat", toNodeHandler(auth)); For ExpressJS v5

// JSON middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body keys:', Object.keys(req.body || {}));
  }
  next();
});

// Test route to verify server is running
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    origin: req.headers.origin,
    authMounted: true
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins: allowedOrigins,
      requestOrigin: req.headers.origin
    },
    auth: {
      mounted: true,
      endpoints: [
        '/api/auth/sign-up/email',
        '/api/auth/sign-in/email', 
        '/api/auth/sign-out',
        '/api/auth/session'
      ]
    }
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use(errorMiddleware as any);

export { app };