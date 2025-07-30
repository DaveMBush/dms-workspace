import axios from "axios";

// Global rate limiting - track last API call time
let lastApiCallTime = 0;
const RATE_LIMIT_DELAY = 60 * 1000; // 1 minute in milliseconds

export async function getConsistentDistributions(symbol: string): Promise<boolean> {
  // Rate limiting - ensure we don't make calls more frequently than once per minute
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;

  if (timeSinceLastCall < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // Update the last call time
  lastApiCallTime = Date.now();

  const today = new Date();
  const oneYearAgo = new Date(today.valueOf() - 365 * 24 * 60 * 60 * 1000);
  const formatDate = (date: Date) =>
    `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
  const url = `https://www.cefconnect.com/api/v3/distributionhistory/fund/${symbol}/${formatDate(oneYearAgo)}/${formatDate(today)}`;

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': `https://www.cefconnect.com/fund/${symbol}`,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
  });
  const data = response.data?.Data || [];
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }
  // Convert and sort by date ascending (oldest first)
  const rows = data
    .map((row: any) => ({
      amount: row.TotDiv,
      date: new Date(row.ExDivDateDisplay),
    }))
    .filter((row: any) => !isNaN(row.date.valueOf()))
    .sort((a: any, b: any) => a.date.valueOf() - b.date.valueOf());

  // Get the three most recent ex-dates (last 3 in chronological order)
  const recentExDates = rows.slice(-3);

  // Check for a declining trend in distributions
  // We need at least 3 distributions to check for a trend
  if (recentExDates.length < 3) {
    return true; // Not enough data to determine trend
  }

  const currentDistribution = recentExDates[2].amount;      // Most recent
  const previousDistribution = recentExDates[1].amount;     // Middle
  const distributionBeforePrevious = recentExDates[0].amount; // Oldest

  // If we have a declining trend (each value < previous), return false
  if (currentDistribution < previousDistribution && previousDistribution < distributionBeforePrevious) {
    return false;
  }

  return true;
}
