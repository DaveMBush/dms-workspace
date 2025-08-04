/* eslint-disable no-restricted-syntax -- This is a utility function that intentionally uses Promises */
export async function sleep(ms: number): Promise<void> {
  return new Promise(function sleepPromise(resolve) {
    setTimeout(resolve, ms);
  });
}
