import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import { config } from './config/environment';
import { routes } from './api/routes';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './api/middleware/error.middleware';
import { auth } from './lib/auth';


// Create Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? process.env.CORS_ORIGIN 
    : "http://localhost:3000",
  credentials: true,
}));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Backend API is running!" });
});

// Better-auth routes
app.all("/api/auth/*", auth.handler);

// API routes
app.use('/api', routes);

// // Cookie parsing
// app.use(cookieParser());

// // Body parsing
// app.use(express.json());
// // app.use(express.urlencoded({ extended: true }));

// // Security middleware
// app.use(helmet({
//   contentSecurityPolicy: false, 
//   crossOriginEmbedderPolicy: false
// }));

// // Request logging middleware
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
//   if (req.method === 'POST' || req.method === 'PUT') {
//     console.log('Body:', req.body);
//   }
//   next();
// });

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.status(200).json({ 
//     status: 'ok',
//     timestamp: new Date().toISOString(), 
//   });
// });

// // Test route to verify server is running
// app.get('/test', (req, res) => {
//   res.json({ 
//     message: 'Server is running!',
//     timestamp: new Date().toISOString(),
//     env: process.env.NODE_ENV
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
//   res.status(404).json({
//     status: 'error',
//     message: 'Route not found',
//     path: req.originalUrl
//   });
// });

// // Error handling middleware
// app.use(errorMiddleware as any);

export { app };