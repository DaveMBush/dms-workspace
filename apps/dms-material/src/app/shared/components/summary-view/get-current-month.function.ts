export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${monthStr}`;
}
