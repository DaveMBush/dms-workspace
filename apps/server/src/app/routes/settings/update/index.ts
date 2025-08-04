import { FastifyInstance } from "fastify";

import { prisma } from "../../../prisma/prisma-client";
import { getDistributions } from "../common/get-distributions.function";
import { getLastPrice } from "../common/get-last-price.function";

interface Distribution {
  distribution: number;
  distributions_per_year: number;
  ex_date: Date;
}

function getCurrentDistribution(universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number]): Distribution {
  return {
    distribution: universe.distribution,
    distributions_per_year: universe.distributions_per_year,
    ex_date: universe.ex_date!,
  };
}

async function checkForNewDistribution(universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number]): Promise<Distribution | null> {
  if (!universe.ex_date || universe.ex_date >= new Date()) {
    return null;
  }

  const newDistribution = await getDistributions(universe.symbol);
  if (newDistribution === undefined) {
    return null;
  }

  return newDistribution;
}

function shouldUpdateDistribution(distribution: Distribution, universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number]): boolean {
  return Boolean(universe.ex_date &&
         distribution.ex_date > universe.ex_date);
}

async function updateUniverseWithDistribution(universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number], lastPrice: number, distribution: Distribution): Promise<void> {
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

async function updateUniverseWithoutDistribution(universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number], lastPrice: number): Promise<void> {
  await prisma.universe.update({
    where: { id: universe.id },
    data: {
      last_price: lastPrice ?? 0,
    },
  });
}

async function processUniverse(universe: Awaited<ReturnType<typeof prisma.universe.findMany>>[number]): Promise<void> {
  const lastPrice = await getLastPrice(universe.symbol);
  let distribution = getCurrentDistribution(universe);

  const newDistribution = await checkForNewDistribution(universe);
  if (newDistribution !== null) {
    distribution = newDistribution;
  }

  const lastPriceValue = lastPrice ?? 0;

  if (shouldUpdateDistribution(distribution, universe)) {
    await updateUniverseWithDistribution(universe, lastPriceValue, distribution);
  } else {
    await updateUniverseWithoutDistribution(universe, lastPriceValue);
  }
}

async function updateAllUniverses(): Promise<void> {
  const universes = await prisma.universe.findMany();

  for (let i = 0; i < universes.length; i++) {
    const universe = universes[i];
    await processUniverse(universe);
  }
}

function handleUpdateRoute(fastify: FastifyInstance): void {
  fastify.get('/',
    async function handleUpdateRequest(_, __): Promise<void> {
      await updateAllUniverses();
    }
  );
}

export default function registerUpdateRoutes(fastify: FastifyInstance): void {
  handleUpdateRoute(fastify);
}
