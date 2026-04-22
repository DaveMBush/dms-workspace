import { FastifyInstance } from 'fastify';

import { fetchVolatilityForAllSymbols } from '../../../volatility/volatility-query.function';
import { VolatilityResult } from '../../../volatility/volatility-result.interface';

export default function registerVolatilityRoute(
  fastify: FastifyInstance
): void {
  fastify.get<{ Reply: VolatilityResult[] }>(
    '/volatility',
    async function handleGetVolatility(): Promise<VolatilityResult[]> {
      return fetchVolatilityForAllSymbols();
    }
  );
}
