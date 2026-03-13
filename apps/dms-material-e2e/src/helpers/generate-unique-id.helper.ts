export function generateUniqueId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(4));
  const randomStr = Array.from(randomBytes)
    .map(function byteToString(b: number): string {
      return b.toString(36);
    })
    .join('')
    .substring(0, 5);
  return `${Date.now()}-${randomStr}`;
}
