import { FastifyInstance } from "fastify";
import { RiskGroup } from "../common/risk-group.interface";
import { prisma } from "../../../prisma/prisma-client";
import { getLastPrice } from "../common/get-last-price.function";
import { getDistribution } from "../common/get-distribution.function";

export default async function (fastify: FastifyInstance): Promise<void> {

  // Route to fetch accounts by IDs
  // Path: POST /api/accounts
  fastify.get<{ Body: void, Reply: void }>('/',
    async function (request, reply): Promise<void> {
      console.log('HANDLER: POST /api/settings/update');

      const universes = await prisma.universe.findMany();

      await Promise.all(
        universes.map(async (universe) => {
          const lastPrice = await getLastPrice(universe.symbol);
          const distribution = await getDistribution(universe.symbol);
          if (!distribution) {
            console.log(`No distribution found for ${universe.symbol}`);
          }
          if (distribution != null && distribution.ex_date > universe.ex_date) {
            await prisma.universe.update({
              where: { id: universe.id },
              data: {
                last_price: lastPrice,
                ex_date: distribution.ex_date,
                distributions_per_year: distribution.distributions_per_year,
                distribution: distribution.distribution,
              },
            });
          } else {
            await prisma.universe.update({
              where: { id: universe.id },
              data: {
                last_price: lastPrice,
              },
            });
          }
        })
      );
    }
  );
}
