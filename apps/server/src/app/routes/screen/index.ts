import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/prisma-client';
import axios from 'axios';
import { ScreeningData } from './screening-data.interface';
import * as cheerio from 'cheerio';
import { getConsistentDistributions } from './get-consistent-distributions.function';


export default async function (fastify: FastifyInstance): Promise<void> {

  // Route to fetch accounts by IDs
  // Path: POST /api/accounts
  fastify.post < { Body: void , Reply: void }>('/',
    {
      schema: {
        body: {
        },
      },
    },
    async function (request, reply): Promise<void> {
      const riskGroup = [];
      const riskGroups = await prisma.risk_group.findMany();
      riskGroup[0] = riskGroups.find(riskGroup => riskGroup.name === 'Equities')!;
      riskGroup[1] = riskGroups.find(riskGroup => riskGroup.name === 'Income')!;
      riskGroup[2] = riskGroups.find(riskGroup => riskGroup.name === 'Tax Free Income')!;

      // grab today's list of symbols from cefconnect
      // https://www.cefconnect.com/api/v3/dailypricing
      const url = 'https://www.cefconnect.com/api/v3/dailypricing';
      const response = await axios.get<ScreeningData>(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': `https://www.cefconnect.com/closed-end-funds-screener`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    });
    const data = response.data || [];
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`No results for screening data`);
      return undefined;
    }
    const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000);
    // filter out new symbols
    const qualifyingSymbols = data
      .filter((d) => {
        // if the inception date is more than 5 years ago,
        // it qualifies
        if (new Date(d.InceptionDate) > fiveYearsAgo) {
          return false;
        }
        // // Make sure there is enough volume to trade
        // if (d.AvgDailyVolume < 99999) {
        //   return false;
        // }
        // make sure the distribution is:
        // > 5% annualized for equities
        // > 6% annualized for fixed income
        // > 4% annualized for tax free
        if (d.DistributionFrequency === 'Monthly') {
          // equities
          if((d.CategoryId <= 10 || d.CategoryId === 25 || d.CategoryId === 26) && 12 * d.CurrentDistribution/d.Price < 0.05) {
            return false;
          }
          // fixed income
          if(d.CategoryId >= 11 && d.CategoryId <= 20 && 12 * d.CurrentDistribution/d.Price < 0.06) {
            return false;
          }
          // tax free
          if(d.CategoryId >= 21 && d.CategoryId <= 24 && 12 * d.CurrentDistribution/d.Price < 0.04) {
            return false;
          }
        }
        else if(d.DistributionFrequency === 'Quarterly') {
          // equities
          if((d.CategoryId <= 10 || d.CategoryId === 25 || d.CategoryId === 26) && 4 * d.CurrentDistribution/d.Price < 0.05) {
            return false;
          }
          // fixed income
          if(d.CategoryId >= 11 && d.CategoryId <= 20 && 4 * d.CurrentDistribution/d.Price < 0.06) {
            return false;
          }
          // tax free
          if(d.CategoryId >= 21 && d.CategoryId <= 24 && 4 * d.CurrentDistribution/d.Price < 0.04) {
            return false;
          }
        }
        // we are only interested in monthly/quarterly
        else {
          return false;
        }

        return true;
      });

      qualifyingSymbols.forEach(async (qs) => {
        let riskGroupId = '';
        if(qs.CategoryId <= 10 || qs.CategoryId === 25 || qs.CategoryId === 26) {
          riskGroupId = riskGroup[0].id;
        }
        else if(qs.CategoryId >= 11 && qs.CategoryId <= 20) {
          riskGroupId = riskGroup[1].id;
        }
        else if(qs.CategoryId >= 21 && qs.CategoryId <= 24) {
          riskGroupId = riskGroup[2].id;
        }
        else {
          return;
        }
        // find the existing symbol if it exists
        const existingSymbol = await prisma.screener.findUnique({
          where: {
            symbol: qs.Ticker,
          },
        });
        const inceptionDate = new Date(qs.InceptionDate);
        // if the inception is more recent than 5 years ago
        if(inceptionDate > new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)) {
          return;
        }
        // Load the main CEF page for the symbol
        const cefPage = await axios.get(`https://www.cefconnect.com/fund/${qs.Ticker}`);
        const $ = cheerio.load(cefPage.data);
        // get the holdings
        const holdings = $('#ContentPlaceHolder1_cph_main_cph_main_ucPortChar_pcSummaryGrid').map((i, el) => {
          return parseInt($(el).find('tr:nth-child(2) td:nth-child(2)').text().trim());
        }).get().reduce((a, b) => a + b, 0);
        if(holdings < 50 && !existingSymbol) {
          return;
        }
        // get the total percent of top holdings
        const totalPercentTopHoldings = $('#ContentPlaceHolder1_cph_main_cph_main_ucPortChar_TopHoldingsGrid tbody tr').map((i, el) => {
          return parseFloat($(el).find('td:nth-child(2)').text());
        }).get().reduce((a, b) => a + b, 0);
        if(totalPercentTopHoldings > 40 && !existingSymbol) {
          return;
        }
        // get the consistent distributions
        const consistentDistributions = await getConsistentDistributions(qs.Ticker);
        if(!consistentDistributions && !existingSymbol) {
          return;
        }
        if(existingSymbol && (holdings < 50 || totalPercentTopHoldings > 40 || !consistentDistributions)) {
          await prisma.screener.delete({
            where: {
              symbol: qs.Ticker,
            },
          });
          return;
        }
        // create a new symbol or update an existing one
        await prisma.screener.create({
          data: {
            symbol: qs.Ticker,
            risk_group_id: riskGroupId,
            has_volitility: false,
            objectives_understood: false,
            graph_higher_before_2008: false,
          },
        });
      });
      // remove symbols that are no longer on CEFConnect
      await prisma.screener.deleteMany({
        where: {
          symbol: {
            notIn: qualifyingSymbols.map((qs) => qs.Ticker),
          },
        },
      });
  });
}

