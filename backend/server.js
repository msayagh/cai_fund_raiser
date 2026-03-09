'use strict';

require('dotenv').config();

const config = require('./src/config/env');
const app = require('./src/app');
const prisma = require('./src/db/client');
const logger = require('./src/utils/logger');

const server = app.listen(config.PORT, () => {
  logger.info(`🕌 Mosque App API started`, {
    port: config.PORT,
    env: config.NODE_ENV,
    url: `http://localhost:${config.PORT}`,
  });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully…`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database disconnected. Goodbye.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
  process.exit(1);
});
