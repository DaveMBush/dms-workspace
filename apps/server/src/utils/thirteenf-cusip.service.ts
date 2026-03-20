/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related 13f.info CUSIP resolution functions */
import { logger } from './structured-logger';

// Global rate limiting - track last API call time
let lastThirteenfCallTime = 0;
const THIRTEENF_RATE_LIMIT_DELAY = 1000; // 1 second in milliseconds

export async function enforceThirteenfRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastThirteenfCallTime;

  if (timeSinceLastCall < THIRTEENF_RATE_LIMIT_DELAY) {
    const waitTime = THIRTEENF_RATE_LIMIT_DELAY - timeSinceLastCall;
    // eslint-disable-next-line no-restricted-syntax -- Promise
    await new Promise(function rateLimitPromise(resolve) {
      setTimeout(resolve, waitTime);
    });
  }
}

export function updateThirteenfLastCallTime(): void {
  lastThirteenfCallTime = Date.now();
}

export async function resolveCusipViaThirteenf(
  cusip: string
): Promise<string | null> {
  await enforceThirteenfRateLimit();
  try {
    const response = await fetch(
      `https://13f.info/cusip/${encodeURIComponent(cusip)}`
    );
    updateThirteenfLastCallTime();

    if (!response.ok) {
      logger.warn(
        `13f.info returned ${String(response.status)} for CUSIP ${cusip}`,
        { cusip, status: response.status }
      );
      return null;
    }

    const html = await response.text();

    const jsonLdRegex =
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
    const jsonLdMatch = jsonLdRegex.exec(html);
    if (!jsonLdMatch) {
      return null;
    }

    const jsonLd = JSON.parse(jsonLdMatch[1]) as {
      itemListElement?: Array<{ name?: string }>;
    };
    const items = jsonLd.itemListElement;
    if (!items || items.length === 0) {
      return null;
    }

    return items[0].name ?? null;
  } catch (error: unknown) {
    logger.warn(`Error resolving CUSIP ${cusip} via 13f.info`, {
      cusip,
      error: String(error),
    });
    return null;
  }
}
