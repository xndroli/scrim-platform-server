import { app } from './app';
import { config } from './config/environment';
import { checkDbConnection } from './db';
import { checkRedisConnection } from './utils/redis';
import { discordService } from './services/discord.service';

const PORT = config.PORT || 3000;

async function startServer() {
  console.log('🚀 Starting server...');
  console.log(`📦 Environment: ${config.NODE_ENV}`);
  console.log(`🔧 Port: ${PORT}`);
  
  // Check database connection
  console.log('🔍 Checking database connection...');
  const dbConnected = await checkDbConnection();
  if (!dbConnected) {
    console.error('❌ Failed to connect to database. Exiting...');
    process.exit(1);
  }
  console.log('✅ Database connected');
  
  // Check Redis connection (optional)
  console.log('🔍 Checking Redis connection...');
  const redisConnected = await checkRedisConnection();
  if (redisConnected) {
    console.log('✅ Redis connected');
  } else {
    console.log('⚠️  Redis not connected (some features may be limited)');
  }
  
  // Initialize Discord bot (optional)
  if (config.DISCORD_BOT_TOKEN) {
    console.log('🔍 Initializing Discord bot...');
    try {
      await discordService.initialize();
      console.log('✅ Discord bot initialized');
    } catch (error) {
      console.log('⚠️  Discord bot initialization failed (Discord features will be limited)');
      console.error(error);
    }
  }

  // Start the server
  app.listen(PORT, () => {
    console.log('✅ Server is running');
    console.log(`📡 API available at: http://localhost:${PORT}/api`);
    console.log(`🏥 Health check at: http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoint at: http://localhost:${PORT}/test`);
    console.log(`🔐 Auth endpoints at: http://localhost:${PORT}/api/auth/*`);
    console.log('');
    console.log('Available auth endpoints:');
    console.log('  POST /api/auth/sign-up/email');
    console.log('  POST /api/auth/sign-in/email');
    console.log('  POST /api/auth/sign-out');
    console.log('  GET  /api/auth/session');
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (config.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Exit the process as the state is unknown
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});