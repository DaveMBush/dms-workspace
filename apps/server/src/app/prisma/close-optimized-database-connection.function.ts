import { optimizedPrisma } from './optimized-prisma-client';

/**
 * Graceful shutdown for optimized client
 */
export async function closeOptimizedDatabaseConnection(): Promise<void> {
  try {
    await optimizedPrisma.$disconnect();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Error closing optimized database connection: ${errorMessage}`
    );
  }
}
