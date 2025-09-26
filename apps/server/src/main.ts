import fastify from 'fastify';

import { configureApp } from './app/app';
import {
  closeDatabaseConnection,
  connectWithRetry,
} from './app/prisma/prisma-client';
import {
  initializeDatabaseUrl,
  validateEnvironmentVariables,
} from './utils/aws-config';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT !== undefined ? Number(process.env.PORT) : 3000;

// Instantiate Fastify with some config
const server = fastify({
  logger: true,
  // Set request timeout to 8 hours for long-running operations like Update Fields
  requestTimeout: 28800000, // 8 hours in milliseconds
});

// Register your application as a normal plugin.
server.register(configureApp);

// Graceful shutdown handling
const shutdown = async function handleShutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down gracefully...`);

  try {
    // Close Fastify server
    await server.close();
    console.log('Fastify server closed');

    // Close database connections
    await closeDatabaseConnection();

    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', function handleSigterm(_) {
  void shutdown('SIGTERM');
});
process.on('SIGINT', function handleSigint(_) {
  void shutdown('SIGINT');
});

// Start the server with database connection retry
async function startServer(): Promise<void> {
  try {
    // Validate environment variables
    validateEnvironmentVariables();

    // Initialize database configuration from AWS Parameter Store or environment
    await initializeDatabaseUrl();

    // Connect to database with retry logic
    await connectWithRetry();

    // Start listening
    await server.listen({ port, host });
    console.log(server.printRoutes());
    console.log(`🚀 Server ready at http://${host}:${port}`);
    console.log(`💚 Health check available at http://${host}:${port}/health`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

void startServer();
