import { FastifyInstance, FastifyReply } from 'fastify';

import { addSymbol } from './add-symbol.function';
import { sendUniverseFailure } from './error-mapper.function.ts';
import { validateAddSymbolRequest } from './validate-add-symbol-request.function';

interface AddSymbolRequest {
  symbol: string;
  risk_group_id: string;
}

interface AddSymbolResponse {
  id: string;
  symbol: string;
  risk_group_id: string;
  distribution: number | null;
  distributions_per_year: number | null;
  ex_date: string | null;
  last_price: number | null;
  most_recent_sell_date: string | null;
  expired: boolean;
  is_closed_end_fund: boolean;
  createdAt: string;
  updatedAt: string;
  fetchFailed: boolean;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: string[];
}

function handleAddSymbolError(error: unknown, reply: FastifyReply): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  if (errorMessage.includes('already exists')) {
    sendUniverseFailure(reply, 409, {
      error: 'Conflict',
      message: errorMessage,
    });
    return;
  }

  if (errorMessage.includes('not found')) {
    sendUniverseFailure(reply, 404, {
      error: 'Not Found',
      message: errorMessage,
    });
    return;
  }

  sendUniverseFailure(reply, 500, {
    error: 'Internal Server Error',
    message: 'Failed to add symbol to universe',
  });
}

export default function registerAddSymbol(fastify: FastifyInstance): void {
  fastify.post<{
    Body: AddSymbolRequest;
    Reply: AddSymbolResponse | ErrorResponse;
  }>(
    '/add-symbol',
    {
      schema: {
        body: {
          type: 'object',
          required: ['symbol', 'risk_group_id'],
          properties: {
            symbol: { type: 'string' },
            risk_group_id: { type: 'string' },
          },
        },
      },
    },
    async function handleAddSymbol(request, reply): Promise<void> {
      try {
        const validation = validateAddSymbolRequest(request.body);

        if (!validation.isValid) {
          sendUniverseFailure(reply, 400, {
            error: 'Validation failed',
            details: validation.errors,
          });
          return;
        }

        const result = await addSymbol(request.body);
        reply.status(201).send(result);
      } catch (error) {
        handleAddSymbolError(error, reply);
      }
    }
  );
}
