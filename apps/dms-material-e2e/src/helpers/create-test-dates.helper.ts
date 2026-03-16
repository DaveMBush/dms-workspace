export function createTestDates(): { futureDate: Date; pastDate: Date } {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 30);
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 30);
  return { futureDate, pastDate };
}
