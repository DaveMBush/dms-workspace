import { FastifyReply, FastifyRequest } from 'fastify';

import { applySecurityValidation } from '../../utils/apply-security-validation.function';
import { getAuthCookieName } from '../../utils/get-auth-cookie-name.function';
import { handleClearCookiesError } from './handle-clear-cookies-error.function';
import { logSuccessfulLogout } from './log-successful-logout.function';
import { tokenBlacklistService } from './token-blacklist.function';

const CLEAR_COOKIES_ERROR_MESSAGE = 'Error clearing cookies';

export async function handleClearCookies(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Apply security validations
  const isBlocked = await applySecurityValidation(request, reply);
  if (isBlocked) {
    return; // Response already sent
  }

  try {
    // Get the current token from cookie for blacklisting
    const cookieName = getAuthCookieName();
    const currentToken = request.cookies[cookieName];

    if (
      currentToken !== null &&
      currentToken !== undefined &&
      currentToken !== ''
    ) {
      // Add token to blacklist
      tokenBlacklistService.addToBlacklist(currentToken, undefined, 'logout');
    }

    // Clear all authentication cookies
    const cookiesToClear = [
      cookieName, // Use the same cookie name logic
      'csrf-token',
      'session-id',
      'refresh-token',
    ];

    function clearCookieWithOptions(name: string): void {
      reply.clearCookie(name, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
    }

    cookiesToClear.forEach(clearCookieWithOptions);

    // Log successful logout
    logSuccessfulLogout(request, Boolean(currentToken));

    await reply.code(200).send({
      message: 'Cookies cleared successfully',
    });
  } catch (error) {
    await handleClearCookiesError(
      request,
      reply,
      error,
      CLEAR_COOKIES_ERROR_MESSAGE
    );
  }
}
