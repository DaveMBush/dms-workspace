// Re-export of the shared universe-domain failure mapper (Story 14.2). This
// sibling lets `add-symbol/index.ts` import the identical specifier string
// `'./error-mapper.function.ts'` that `universe/index.ts` uses, so both routes
// reference one shared module while living in different folders.
export { sendUniverseFailure } from '../error-mapper.function.ts';
