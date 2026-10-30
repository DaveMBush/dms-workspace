import { describe, expect, it } from 'vitest';
import { resolveAppPort } from './resolve-app-port';

// TDD RED Phase: Story 11.1 - stable Electron origin across launches.
// The no-override default case currently resolves a random free port via
// findAvailablePort(), so the app loads a new http://localhost:<port> origin on
// every launch and cookies/localStorage (AD-5 auth cookie, sort/filter/theme/
// remember-me) are discarded. AC #1/#2 below define the contract Story 11.2 must
// satisfy when it pins the default to a single fixed port; they are intentionally
// red against the current implementation and marked it.skip so CI stays green until
// Story 11.2 Task 1 un-skips them, confirms red, then implements until green.
// Both red-phase ACs key off this one named value (not a scattered magic number),
// matching "every AC keys off a single fixed default."
const expectedDefaultPort = 7420;

describe('resolveAppPort', () => {
  // AC #1 - with no override set, the resolved port equals a single fixed default
  // (not a random value). Red today: findAvailablePort() returns a random free port
  // that does not equal expectedDefaultPort. Story 11.2 makes the no-override branch
  // return this fixed default so this passes.
  it('resolves to the fixed default port when no override is set (AC #1)', async () => {
    const port = await resolveAppPort({});
    expect(port).toBe(expectedDefaultPort);
  });

  // AC #2 - two consecutive resolutions with no override return the identical port,
  // proving the origin http://localhost:<port> is stable across launches so cookies
  // and localStorage persist. Red today: each call picks a different random free port.
  // Story 11.2 makes both calls return the fixed default so this passes.
  it('returns an identical port across consecutive resolutions (stable origin) (AC #2)', async () => {
    const first = await resolveAppPort({});
    const second = await resolveAppPort({});
    expect(second).toBe(first);
  });

  // AC #3 - the DMS_SMOKE_PORT override wins over the default and returns exactly the
  // configured value, preserving existing smoke-test behavior. Green today (the
  // override path is unchanged by this story) and must stay green after Story 11.2.
  it('returns the DMS_SMOKE_PORT override when set (AC #3)', async () => {
    const port = await resolveAppPort({ DMS_SMOKE_PORT: '4999' });
    expect(port).toBe(4999);
  });

  // AC #3 guard - the override also wins over the fixed default, so a smoke run is
  // never pinned to expectedDefaultPort. Green today and must stay green after Story 11.2.
  it('lets DMS_SMOKE_PORT take precedence over the default port (AC #3)', async () => {
    const override = '5001';
    const port = await resolveAppPort({ DMS_SMOKE_PORT: override });
    expect(port).toBe(5001);
    expect(port).not.toBe(expectedDefaultPort);
  });
});
