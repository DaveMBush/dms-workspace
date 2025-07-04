import axios from 'axios';
import { sleep } from './sleep.function';

let lastRequestTime = 0;

export async function getDistributions(symbol: string): Promise<{
  distribution: number;
  ex_date: Date;
  distributions_per_year: number;
}> {
  // Rate limit: 1 request per minute
  const now = Date.now();
  if (now - lastRequestTime < 60_000) {
    await sleep(60_000 - (now - lastRequestTime));
  }
  lastRequestTime = Date.now();

  const today = new Date();
  const oneYearAgo = new Date(today.valueOf() - 365 * 24 * 60 * 60 * 1000);
  const formatDate = (date: Date) =>
    `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
  const url = `https://www.cefconnect.com/api/v3/distributionhistory/fund/${symbol}/${formatDate(oneYearAgo)}/${formatDate(today)}`;

  try {
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
      return undefined;
    }
    // Convert and sort by date ascending
    const rows = data
      .map((row: any) => ({
        amount: row.TotDiv,
        date: new Date(row.ExDivDateDisplay),
      }))
      .filter((row: any) => !isNaN(row.date.valueOf()))
      .sort((a: any, b: any) => a.date.valueOf() - b.date.valueOf());

    // Find next ex-date after or equal to today, or most recent past ex-date
    const nowDate = today;
    let nextOrRecent = rows.find((row: any) => row.date >= nowDate);
    if (!nextOrRecent) {
      nextOrRecent = rows[rows.length - 1]; // most recent past
    }

    // Determine distributions per year
    let perYear = 1;
    if (rows.length > 1) {
      // Find the most recent 2-4 past distributions
      const recentRows = rows
        .filter((row: any) => row.date < nowDate)
        .slice(-4)
        .reverse(); // oldest to newest
      if (recentRows.length > 1) {
        const intervals = [];
        for (let i = 1; i < recentRows.length; i++) {
          intervals.push(
            (recentRows[i].date.valueOf() - recentRows[i - 1].date.valueOf()) /
              (1000 * 60 * 60 * 24)
          );
        }
        const avgInterval =
          intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (avgInterval < 40) {
          perYear = 12;
        } else if (avgInterval < 120) {
          perYear = 4;
        }
      }
    }
    return {
      distribution: nextOrRecent.amount,
      ex_date: nextOrRecent.date,
      distributions_per_year: perYear,
    };
  } catch (error) {
    return {
      distribution: 0,
      ex_date: new Date(),
      distributions_per_year: 0,
    };
  }
}
