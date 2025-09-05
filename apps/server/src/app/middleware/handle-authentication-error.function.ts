import { FastifyReply, FastifyRequest } from 'fastify';

import { AuthError } from '../types/auth.types';
import { createErrorResponse } from './create-error-response.function';
import { recordAuthFailure } from './record-auth-failure.function';

interface AuthErrorContext {
  clientIP: string;
  startTime: number;
}

export async function handleAuthenticationError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  context: AuthErrorContext
): Promise<void> {
  const duration = Date.now() - context.startTime;
  recordAuthFailure(context.clientIP);

  if (error instanceof AuthError) {
    request.log.warn(
      {
        error: error.message,
        errorType: error.type,
        clientIP: context.clientIP,
        duration,
        action: 'authentication_failed',
        requestId: request.id,
      },
      'Authentication failed'
    );

    await reply
      .code(error.statusCode)
      .send(createErrorResponse('Unauthorized', error.message, request.id));
    return;
  }

  // Handle unexpected errors
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  request.log.error(
    {
      error: errorMessage,
      stack: errorStack,
      clientIP: context.clientIP,
      duration,
      action: 'authentication_error',
      requestId: request.id,
    },
    'Unexpected authentication error'
  );

  await reply
    .code(500)
    .send(
      createErrorResponse(
        'Internal Server Error',
        'Authentication service temporarily unavailable',
        request.id
      )
    );
}
