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
    console.log(`Rate limiting: waiting ${waitTime}ms before next API call`);
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
    console.log(`No distributions found for ${symbol}`);
    return false;
  }
  // Convert and sort by date descending
  const rows = data
    .map((row: any) => ({
      amount: row.TotDiv,
      date: new Date(row.ExDivDateDisplay),
    }))
    .filter((row: any) => !isNaN(row.date.valueOf()))
    .sort((a: any, b: any) => b.date.valueOf() - a.date.valueOf());

  // Find next ex-date after or equal to today, or most recent past ex-date
  const nowDate = new Date();
  let nextOrRecent = rows.findIndex((row: any) => row.date >= nowDate);
  // get the three most recent ex-dates
  const recentExDates = rows.slice(nextOrRecent, nextOrRecent + 3);
  // check for a declining trend in distributions
  // where a declining trend is 3 ex-dates in a row
  // where the distribution strictly decreases (each value < previous)
  const isDeclining = recentExDates.every((row: any, index: number) => {
    if (index === 0) return true;
    return row.amount < recentExDates[index - 1].amount;
  });
  const result = !isDeclining; // Return true if NOT declining (i.e., consistent or increasing)

  return result;
}
