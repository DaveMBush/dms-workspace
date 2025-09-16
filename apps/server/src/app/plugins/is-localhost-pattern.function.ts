export function isLocalhostPattern(origin: string): boolean {
  const localhostPattern =
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/;
  return localhostPattern.test(origin);
}
