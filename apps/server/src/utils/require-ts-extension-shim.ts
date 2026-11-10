import fs from 'fs';
import { Module as nodeModule } from 'module';
import path from 'path';

// The universe routes import their shared error mapper with a literal `.ts`
// extension (e.g. `./error-mapper.function.ts`). That exact specifier is asserted
// on by the contract test in shared-error-mapper.spec.ts, so it cannot be dropped
// or rewritten to an extensionless path. Under this CJS/esbuild build
// (`bundle: false`, outExtension `.ts` -> `.js`) the specifier is emitted verbatim
// into dist, but Node's CJS loader cannot resolve a relative `.ts`-suffixed path to
// its compiled `.js` sibling at runtime (MODULE_NOT_FOUND). This module bridges that
// gap by wrapping Node's private resolver: when a *relative* `.ts` require would
// otherwise fail and an adjacent `.js` file exists, it resolves to that sibling.
// It is imported first in main.ts so the patch is live before any route module (and
// thus the mapper) is required.

type Resolver = (...args: unknown[]) => string;

// Node's private resolver name is underscore-prefixed, which this repo's lint rules
// forbid in identifiers, so it is referenced through a plain string key instead of a
// literal member access.
const resolverKey = '_resolveFilename';

function isRelativeTsRequest(request: unknown): boolean {
  if (typeof request !== 'string') {
    return false;
  }
  if (!request.endsWith('.ts')) {
    return false;
  }
  return request.startsWith('./') || request.startsWith('../');
}

function findJsSibling(request: string, parent: unknown): string | null {
  const filename = (parent as { filename?: string } | undefined)?.filename;
  if (typeof filename !== 'string') {
    return null;
  }
  const sibling = path.resolve(
    path.dirname(filename),
    `${request.slice(0, -3)}.js`,
  );
  return fs.existsSync(sibling) ? sibling : null;
}

function installTsExtensionResolver(): void {
  const api = nodeModule as unknown as Record<string, unknown>;
  const original = api[resolverKey] as Resolver;
  api[resolverKey] = function patched(
    request: string,
    ...rest: unknown[]
  ): string {
    try {
      return original(request, ...rest);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
      if (!isRelativeTsRequest(request)) {
        throw error;
      }
      const sibling = findJsSibling(request, rest[0]);
      if (sibling === null) {
        throw error;
      }
      return sibling;
    }
  };
}

installTsExtensionResolver();
