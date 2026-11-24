import { afterEach, describe, expect, it } from 'vitest';
import { createCorsOriginHandler } from './cors-origin-handler.function';

const logger = { warn: () => undefined };

async function invoke(
  handler: ReturnType<typeof createCorsOriginHandler>,
  origin: string | undefined,
): Promise<{ error: Error | null; allow: boolean }> {
  return new Promise((resolve) => {
    handler(origin, (error, allow) => resolve({ error, allow }));
  });
}

describe('createCorsOriginHandler', () => {
  afterEach(() => {
    delete process.env.DMS_DESKTOP_AUTH;
  });

  it('allows a localhost origin in the desktop build even under production NODE_ENV', async () => {
    process.env.DMS_DESKTOP_AUTH = 'mock';
    const handler = createCorsOriginHandler([], 'production', logger);
    const result = await invoke(handler, 'http://localhost:7420');
    expect(result.allow).toBe(true);
    expect(result.error).toBeNull();
  });

  it('rejects a localhost origin in production when not the desktop build', async () => {
    delete process.env.DMS_DESKTOP_AUTH;
    const handler = createCorsOriginHandler([], 'production', logger);
    const result = await invoke(handler, 'http://localhost:7420');
    expect(result.allow).toBe(false);
    expect(result.error?.message).toMatch(/CORS/i);
  });

  it('still rejects a non-localhost origin in the desktop build', async () => {
    process.env.DMS_DESKTOP_AUTH = 'mock';
    const handler = createCorsOriginHandler([], 'production', logger);
    const result = await invoke(handler, 'https://evil.example.com');
    expect(result.allow).toBe(false);
  });

  it('allows an explicitly configured origin regardless of mode', async () => {
    delete process.env.DMS_DESKTOP_AUTH;
    const handler = createCorsOriginHandler(
      ['https://app.example.com'],
      'production',
      logger,
    );
    const result = await invoke(handler, 'https://app.example.com');
    expect(result.allow).toBe(true);
  });

  it('proceeds without CORS headers for same-origin (no Origin) traffic in production', async () => {
    delete process.env.DMS_DESKTOP_AUTH;
    const handler = createCorsOriginHandler([], 'production', logger);
    const result = await invoke(handler, undefined);
    expect(result.allow).toBe(false); // no CORS headers, but not an error
    expect(result.error).toBeNull();
  });
});
