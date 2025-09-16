export function isValidOrigin(origin: string | undefined): boolean {
  return origin !== undefined && origin !== null && origin !== '';
}
