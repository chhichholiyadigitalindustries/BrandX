import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  const app = createApp();

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`========================================================`);
    logger.info(`🚀 BrandX Backend Server running in [${config.env}] mode`);
    logger.info(`📡 Port: ${config.port} (bound to 0.0.0.0)`);
    logger.info(`🔗 API Base: ${config.apiPrefix}`);
    logger.info(`🩺 Health: ${config.apiPrefix}/health`);
    logger.info(`========================================================`);
  });

  await connectDatabase();

  // Graceful shutdown handling
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    const forceExitTimer = setTimeout(() => {
      logger.warn('Forcefully exiting after shutdown timeout (10s).');
      process.exit(1);
    }, 10000);
    if (typeof forceExitTimer.unref === 'function') forceExitTimer.unref();

    server.close(async () => {
      try {
        await disconnectDatabase();
      } catch (err) {
        logger.error('Error during database disconnection on shutdown:', err);
      }
      logger.info('HTTP server and database connections closed. Exiting process.');
      clearTimeout(forceExitTimer);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrapping error:', err);
  process.exit(1);
});
