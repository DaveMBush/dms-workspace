/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file with related CEF scraping functions */
/* eslint-disable @typescript-eslint/no-explicit-any -- Cheerio element types */
/* eslint-disable @typescript-eslint/naming-convention -- $ is a standard Cheerio parameter */
import * as cheerio from 'cheerio';

import { axiosGetWithBackoff } from '../common/axios-get-with-backoff.function';

export async function fetchCefPage(
  symbol: string
): Promise<cheerio.CheerioAPI> {
  const cefPage = await axiosGetWithBackoff<string>(
    `https://www.cefconnect.com/fund/${symbol}`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        Referer: '',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    },
    {}
  );

  return cheerio.load(cefPage.data);
}

export function extractHoldingsCount($: cheerio.CheerioAPI): number {
  return $('#ContentPlaceHolder1_cph_main_cph_main_ucPortChar_pcSummaryGrid tr')
    .map(function mapHoldingsRow(i: number, el: any): number {
      if (
        $(el).find('td:nth-child(1) strong').text().trim() !==
        'Number of Holdings:'
      ) {
        return 0;
      }
      return parseInt($(el).find('td:nth-child(2)').text().trim(), 10);
    })
    .get()
    .reduce(function sumHoldings(a: number, b: number): number {
      return a + b;
    }, 0);
}

export function extractTopHoldingsPercent($: cheerio.CheerioAPI): number {
  return $(
    '#ContentPlaceHolder1_cph_main_cph_main_ucPortChar_TopHoldingsGrid tbody tr'
  )
    .map(function mapTopHoldingsRow(i: number, el: any): number {
      if (i === 0) {
        return 0;
      }
      return parseFloat($(el).find('td:nth-child(3)').text());
    })
    .get()
    .reduce(function sumTopHoldings(a: number, b: number): number {
      return a + b;
    }, 0);
}
