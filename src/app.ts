import express from 'express';
import cors from 'cors';
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from './lib/auth';
// import helmet from 'helmet';
import { config } from './config/environment';
import { routes } from './api/routes';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './api/middleware/error.middleware';

// Create Express app
const app = express();

app.all("/api/auth/*", toNodeHandler(auth)); // For ExpressJS v4
// app.all("/api/auth/*splat", toNodeHandler(auth)); For ExpressJS v5

app.get("/api/me", async (req, res) => {
 	const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
	return res.json(session);
});

// Cookie parsing
app.use(cookieParser());

// Body parsing
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Security middleware
// app.use(helmet({
//   contentSecurityPolicy: false, 
//   crossOriginEmbedderPolicy: false,
// }));

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body:', req.body);
  }
  next();
});

// Test route to verify server is running
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(), 
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