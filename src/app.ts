import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { routes } from './api/routes';
import { errorMiddleware } from './api/middleware/error.middleware';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error handling
app.use(errorMiddleware);

export { app };