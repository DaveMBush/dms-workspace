import { FastifyRequest } from 'fastify';

// @fastify/cookie parses cookies at preValidation, but onRequest hooks (auth,
// CSRF) run earlier — request.cookies is still null there. Parse the raw
// header instead so those hooks can read cookie values safely.
export function getCookieValue(
  request: FastifyRequest,
  name: string
): string | undefined {
  const header = request.headers.cookie;
  if (typeof header !== 'string') {
    return undefined;
  }

  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      continue;
    }
    if (part.slice(0, idx).trim() !== name) {
      continue;
    }
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}
