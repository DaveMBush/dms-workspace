/* eslint-disable @smarttools/one-exported-item-per-file -- Test helper exports alongside default route registration */
import { FastifyInstance, FastifyRequest } from 'fastify';

import { StructuredLogger } from '../../../../utils/structured-logger';
import { prisma } from '../../../prisma/prisma-client';
import type { ProcessedRow } from '../../common/distribution-api.function';
import { getDistributions } from '../common/get-distributions.function';
import { getLastPrice } from '../common/get-last-price.function';
import { recalculateUniverseVolatility } from '../../../volatility/recalculate-universe-volatility.function';

interface Distribution {
  distribution: number;
  distributions_per_year: number;
  ex_date: Date;
}

interface DistributionWithHistory {
  distribution: Distribution | null;
  history: ProcessedRow[];
}

function getCurrentDistribution(
  universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number]
): Distribution {
  return {
    distribution: universe.distribution,
    distributions_per_year: universe.distributions_per_year,
    ex_date: universe.ex_date!,
  };
}

async function checkForNewDistribution(
  universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number]
): Promise<DistributionWithHistory> {
  const { result: newDistribution, history } = await getDistributions(
    universe.symbol
  );

  if (newDistribution === undefined) {
    return { distribution: null, history };
  }

  return { distribution: newDistribution, history };
}

function shouldUpdateDistribution(
  distribution: Distribution,
  universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number]
): boolean {
  // Update if no existing ex_date (for manually added symbols)
  if (!universe.ex_date) {
    return true;
  }

  // Update if new ex_date is greater than existing
  return distribution.ex_date > universe.ex_date;
}

async function updateUniverseWithDistribution(
  universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number],
  lastPrice: number,
  distribution: Distribution
): Promise<void> {
  await prisma.universe.update({
    where: { id: universe.id },
    data: {
      last_price: lastPrice ?? 0,
      ex_date: distribution.ex_date,
      distributions_per_year: distribution.distributions_per_year,
      distribution: distribution.distribution,
    },
  });
}

async function updateUniverseWithoutDistribution(
  universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number],
  lastPrice: number
): Promise<void> {
  await prisma.universe.update({
    where: { id: universe.id },
    data: {
      last_price: lastPrice ?? 0,
    },
  });
}

async function applyUniverseUpdate(
  universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number],
  lastPriceValue: number,
  distribution: Distribution,
  logger: StructuredLogger
): Promise<void> {
  if (shouldUpdateDistribution(distribution, universe)) {
    await updateUniverseWithDistribution(universe, lastPriceValue, distribution);
    logger.info('Updated universe with new distribution', {
      symbol: universe.symbol,
      lastPrice: lastPriceValue,
      exDate: distribution.ex_date,
      distribution: distribution.distribution,
    });
  } else {
    await updateUniverseWithoutDistribution(universe, lastPriceValue);
    logger.info('Updated universe with last price only', {
      symbol: universe.symbol,
      lastPrice: lastPriceValue,
    });
  }
}

async function recalculateVolatilityWithLogging(
  universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number],
  history: ProcessedRow[],
  logger: StructuredLogger
): Promise<void> {
  try {
    await recalculateUniverseVolatility(universe.id, history);
    logger.info('Recalculated universe volatility', {
      symbol: universe.symbol,
      universeId: universe.id,
      historyLength: history.length,
    });
  } catch (volatilityError) {
    const errorMessage =
      volatilityError instanceof Error
        ? volatilityError.message
        : 'Unknown volatility calculation error';
    const errorStack =
      volatilityError instanceof Error ? volatilityError.stack : undefined;
    logger.error('Failed to recalculate universe volatility', undefined, {
      symbol: universe.symbol,
      universeId: universe.id,
      error: errorMessage,
      stack: errorStack,
    });
    throw new Error(`Volatility calculation failed: ${errorMessage}`);
  }
}

async function processUniverse(
  universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number],
  logger: StructuredLogger
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('Processing universe field update', {
      symbol: universe.symbol,
      universeId: universe.id,
    });

    const lastPrice = await getLastPrice(universe.symbol);
    let distribution = getCurrentDistribution(universe);

    const { distribution: newDistribution, history } =
      await checkForNewDistribution(universe);
    if (newDistribution !== null) {
      distribution = newDistribution;
    }

    const lastPriceValue = lastPrice ?? 0;

    await applyUniverseUpdate(universe, lastPriceValue, distribution, logger);
    await recalculateVolatilityWithLogging(universe, history, logger);

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Failed to process universe field update', undefined, {
      symbol: universe.symbol,
      universeId: universe.id,
      error: errorMessage,
      stack: errorStack,
    });

    return { success: false, error: errorMessage };
  }
}

interface UpdateSummary {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ symbol: string; error: string }>;
}

async function updateAllUniverses(
  logger: StructuredLogger
): Promise<UpdateSummary> {
  const universes = await prisma.universe.findMany();
  const summary: UpdateSummary = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  logger.info('Starting universe field updates', {
    totalUniverses: universes.length,
  });

  for (let i = 0; i < universes.length; i++) {
    const universe = universes[i];
    summary.totalProcessed += 1;
    if (i === universes.length - 1) {
      logger.info('Processing last universe entry');
    }
    const result = await processUniverse(universe, logger);
    if (result.success) {
      summary.successful += 1;
    } else {
      summary.failed += 1;
      summary.errors.push({
        symbol: universe.symbol,
        error: result.error ?? 'Unknown error',
      });
    }
  }

  logger.info('Completed universe field updates', {
    totalProcessed: summary.totalProcessed,
    successful: summary.successful,
    failed: summary.failed,
    errorCount: summary.errors.length,
  });

  if (summary.failed > 0) {
    logger.warn('Some universe updates failed', {
      failedSymbols: summary.errors.map(function mapToSymbol(e) {
        return e.symbol;
      }),
      errors: summary.errors,
    });
  }

  return summary;
}

function handleUpdateRoute(fastify: FastifyInstance): void {
  fastify.get(
    '/',
    async function handleUpdateRequest(request: FastifyRequest, reply) {
      const logger = new StructuredLogger();

      try {
        logger.info('Universe field update requested', {
          requestId: request.id,
          userAgent: request.headers['user-agent'],
        });

        const summary = await updateAllUniverses(logger);

        if (summary.failed === 0) {
          logger.info('Universe field update completed successfully', {
            requestId: request.id,
            summary,
          });
          return await reply.status(200).send({
            success: true,
            message: `Successfully updated ${summary.successful} universe fields`,
            summary,
          });
        }

        logger.error('Universe field update completed with errors', undefined, {
          requestId: request.id,
          summary,
        });
        return await reply.status(207).send({
          success: false,
          message: `Updated ${summary.successful} symbols successfully, but ${summary.failed} failed`,
          summary,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('Universe field update failed completely', undefined, {
          requestId: request.id,
          error: errorMessage,
          stack: errorStack,
        });

        return reply.status(500).send({
          success: false,
          message: 'Universe field update failed completely',
          error: errorMessage,
        });
      }
    }
  );
}

// Export for testing
export const testExports = {
  processUniverse,
  updateAllUniverses,
  checkForNewDistribution,
};

export default function registerUpdateRoutes(fastify: FastifyInstance): void {
  handleUpdateRoute(fastify);
}
