/* eslint-disable @smarttools/one-exported-item-per-file -- Route module exports types and utilities needed for testing */
import { FastifyInstance } from 'fastify';

import { prisma } from '../../prisma/prisma-client';
import registerGetClosedTrades from './get-closed-trades/index';
import registerGetOpenTrades from './get-open-trades/index';

export interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  symbol: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
  expected_dollars: number;
  last_dollars_unrealized_gain_percent: number;
  unrealized_gain_dollars: number;
  target_gain: number;
  target_sell: number;
}

export interface TradeWithUniverseAndDates {
  id: string;
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: Date;
  sell_date?: Date | null;
  quantity: number;
  universe: {
    symbol: string;
    last_price: number;
    distribution: number;
    distributions_per_year: number;
  } | null;
}

interface NewTrade {
  universeId: string;
  accountId: string;
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
}

export function mapTradeToResponse(trade: TradeWithUniverseAndDates): Trade {
  const lastPrice = trade.universe?.last_price ?? 0;
  const distribution = trade.universe?.distribution ?? 0;
  const distributionsPerYear = trade.universe?.distributions_per_year ?? 0;

  const expected_dollars =
    distribution > 0 && distributionsPerYear > 0
      ? trade.quantity * distribution * distributionsPerYear
      : 0;

  const last_dollars_unrealized_gain_percent =
    lastPrice > 0 && trade.buy > 0
      ? ((lastPrice - trade.buy) / trade.buy) * 100
      : 0;

  const unrealized_gain_dollars =
    lastPrice > 0 ? (lastPrice - trade.buy) * trade.quantity : 0;

  const target_gain = distribution > 0 ? trade.quantity * distribution : 0;

  const target_sell = distribution + trade.buy;

  return {
    id: trade.id,
    universeId: trade.universeId,
    accountId: trade.accountId,
    symbol: trade.universe?.symbol ?? '',
    buy: trade.buy,
    sell: trade.sell,
    buy_date: trade.buy_date.toISOString(),
    sell_date: trade.sell_date?.toISOString(),
    quantity: trade.quantity,
    expected_dollars,
    last_dollars_unrealized_gain_percent,
    unrealized_gain_dollars,
    target_gain,
    target_sell,
  };
}

function handleGetTradesRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: string[]; Reply: Trade[] }>(
    '/',
    {
      schema: {
        body: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    async function handleGetTrades(request, _): Promise<Trade[]> {
      const ids = request.body;
      if (ids === null || ids === undefined || ids.length === 0) {
        return [];
      }
      const trades = await prisma.trades.findMany({
        where: { id: { in: ids } },
        include: {
          universe: {
            select: {
              symbol: true,
              last_price: true,
              distribution: true,
              distributions_per_year: true,
            },
          },
        },
      });
      return trades.map(function mapTrade(trade) {
        return mapTradeToResponse(trade);
      });
    }
  );
}

function handleAddTradeRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: NewTrade; Reply: Trade[] }>(
    '/add',
    async function handleAddTrade(request, reply): Promise<void> {
      const result = await prisma.trades.create({
        data: {
          universeId: request.body.universeId,
          accountId: request.body.accountId,
          buy: request.body.buy,
          sell: request.body.sell,
          buy_date: new Date(request.body.buy_date),
          sell_date:
            request.body.sell_date !== null &&
            request.body.sell_date !== undefined
              ? new Date(request.body.sell_date)
              : undefined,
          quantity: request.body.quantity,
        },
      });
      const trade = await prisma.trades.findMany({
        where: { id: { in: [result.id] } },
        include: {
          universe: {
            select: {
              symbol: true,
              last_price: true,
              distribution: true,
              distributions_per_year: true,
            },
          },
        },
      });
      reply.status(200).send(
        trade.map(function mapCreatedTrade(t) {
          return mapTradeToResponse(t);
        })
      );
    }
  );
}

function handleDeleteTradeRoute(fastify: FastifyInstance): void {
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    async function handleDeleteTrade(request, reply): Promise<void> {
      const { id } = request.params;
      await prisma.trades.delete({ where: { id } });
      reply.status(200).send();
    }
  );
}

function handleUpdateTradeRoute(fastify: FastifyInstance): void {
  fastify.put<{ Body: Trade; Reply: Trade[] }>(
    '/',
    async function handleUpdateTrade(request, reply): Promise<void> {
      const {
        id,
        universeId,
        accountId,
        buy,
        sell,
        buy_date,
        sell_date,
        quantity,
      } = request.body;
      await prisma.trades.update({
        where: { id },
        data: {
          universeId,
          accountId,
          buy,
          sell,
          buy_date: new Date(buy_date),
          sell_date:
            sell_date !== null && sell_date !== undefined
              ? new Date(sell_date)
              : undefined,
          quantity,
        },
      });
      const trades = await prisma.trades.findMany({
        where: { id },
        include: {
          universe: {
            select: {
              symbol: true,
              last_price: true,
              distribution: true,
              distributions_per_year: true,
            },
          },
        },
      });
      reply.status(200).send(
        trades.map(function mapUpdatedTrade(t) {
          return mapTradeToResponse(t);
        })
      );
    }
  );
}

export default function registerTradeRoutes(fastify: FastifyInstance): void {
  handleGetTradesRoute(fastify);
  handleAddTradeRoute(fastify);
  handleDeleteTradeRoute(fastify);
  handleUpdateTradeRoute(fastify);
  registerGetOpenTrades(fastify);
  registerGetClosedTrades(fastify);
}
