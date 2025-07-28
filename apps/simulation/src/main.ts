import axios from 'axios';
import yahooFinance from 'yahoo-finance2';
import * as fs from 'fs';
import * as path from 'path';

// Cache for historical data to avoid refetching
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_DIR = './cache';

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Cache functions
function getCacheKey(symbol: string, simulationYears: number): string {
  return `${symbol}-${simulationYears}y.json`;
}

function getCachePath(cacheKey: string): string {
  return path.join(CACHE_DIR, cacheKey);
}

function loadCache(cacheKey: string): any {
  try {
    const cachePath = getCachePath(cacheKey);
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    // Silent error handling
  }
  return null;
}

function saveCache(cacheKey: string, data: any): void {
  try {
    const cachePath = getCachePath(cacheKey);
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silent error handling
  }
}

interface SimulationParams {
  initialCapital: number;
  cashThreshold: number;
  gainThreshold: number;
  simulationYears: number;
  symbols: string[]; // Add symbols array
}

interface DailyData {
  day: number;
  year: number;
  month: number;
  dayOfMonth: number;
  price: number;
  shares: number;
  cash: number;
  totalValue: number;
  dividends: number;
  cumulativeDividends: number;
  trades: string[];
  symbolAllocations: { [symbol: string]: { shares: number; value: number } }; // Track per-symbol allocations
}

interface StrategyResult {
  strategyName: string;
  dailyData: DailyData[];
  finalShares: number;
  finalCash: number;
  finalTotalValue: number;
  totalDividendsCollected: number;
  projectedAnnualDividends: number;
  totalTrades: number;
  symbolResults: { [symbol: string]: { shares: number; value: number; dividends: number } };
}

interface SimulationResult {
  buyAndHold: StrategyResult;
  tradingStrategy: StrategyResult;
  adjustedBuyAndHold: StrategyResult;
  comparison: {
    tradingVsBuyHold: number;
    tradingVsBuyHoldPercent: number;
    adjustedVsBuyHold: number;
    adjustedVsBuyHoldPercent: number;
  };
}

class TradingSimulation {
  public symbols = [
    'EHI', 'OXLC', 'ECC', 'OCCI', 'BCAT', 'ECAT', 'GGT', 'CLM', 'CRF', 'ACP',
    'XFLT', 'NHS', 'GOF', 'IGR', 'BMEZ', 'EDF', 'PDI', 'HIX', 'OPP', 'HQH',
    'NXG', 'AOD', 'DMO', 'BTX', 'FCO', 'HGLB', 'HQL', 'THQ', 'GDO', 'THW',
    'FAX', 'AWP', 'RIV', 'VGI', 'PCM', 'BSTZ', 'JRI', 'VVR', 'GCV', 'EIC',
    'PGZ', 'WDI', 'JFR', 'NMAI', 'NPCT', 'PHK', 'ASGI', 'JQC', 'PFL', 'FTF',
    'BWG', 'NRO', 'KIO', 'AGD', 'PFN', 'AVK', 'BGT', 'NCV', 'FCT', 'PDO',
    'EMD', 'CCD', 'PCF', 'FRA', 'DSU', 'RSF', 'IHD', 'NCZ', 'DSL', 'CHI',
    'IAE', 'CHY', 'JOF', 'USA', 'PCN', 'RA', 'HIO', 'VLT', 'IGA', 'LGI',
    'CPZ', 'IGD', 'PTY', 'BIT', 'MSD', 'IDE', 'FINS', 'GBAB', 'GAB', 'PGP',
    'AEF', 'JLS', 'JPI', 'GUT', 'GHY', 'ZTR', 'BLW', 'TEI', 'JGH', 'HYT',
    'ACV', 'NFJ', 'BHK', 'ARDC', 'SCD', 'HEQ'
  ]; // Array of symbols to simulate

  private async fetchHistoricalData(symbol: string, startDate: Date, endDate: Date, simulationYears: number): Promise<{ prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] }> {
    try {
      // Check cache
      const cacheKey = getCacheKey(symbol, simulationYears);
      const cachedData = loadCache(cacheKey);

      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION && cachedData.data?.prices?.length > 0) {
        return cachedData.data;
      }

      // Add delay only when fetching new data
      await delay(5000);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      const result = await Promise.race([
        yahooFinance.chart(symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1d',
          events: 'dividends'
        }),
        timeoutPromise
      ]) as any;

      if (!result || !result.quotes || result.quotes.length === 0) {
        throw new Error(`No price data found for ${symbol}`);
      }

      const prices: { day: number; price: number }[] = [];
      const dividends: { day: number; amount: number }[] = [];

      // Process price data
      for (let i = 0; i < result.quotes.length; i++) {
        const quote = result.quotes[i];
        const date = new Date(quote.date * 1000);
        const day = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (day >= 0) {
          prices.push({ day, price: quote.close });
        }
      }

      // Process dividend data
      if (result.events && result.events.dividends) {
        for (const dividend of result.events.dividends) {
          const dividendDate = new Date(dividend.date * 1000);
          const day = Math.floor((dividendDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          if (day >= 0) {
            dividends.push({ day, amount: dividend.amount });
          }
        }
      }

      // Cache the fetched data
      saveCache(cacheKey, { data: { prices, dividends }, timestamp: Date.now() });
      return { prices, dividends };
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      throw error;
    }
  }

  private generateDailyPriceSequence(params: SimulationParams): { day: number; price: number }[] {
    const totalDays = params.simulationYears * 365;
    const prices: { day: number; price: number }[] = [{ day: 0, price: params.initialPrice }];

    for (let day = 1; day <= totalDays; day++) {
      const priceChange = (Math.random() - 0.48) * 0.2; // Increased volatility from 0.1 to 0.2 (roughly -10% to +10% daily)
      const newPrice = Math.max(prices[day - 1].price * (1 + priceChange), 0.01);
      prices.push({ day, price: newPrice });
    }
    return prices;
  }

  private getDateInfo(day: number): { year: number; month: number; dayOfMonth: number } {
    const date = new Date(2020, 0, 1); // Start from Jan 1, 2020
    date.setDate(date.getDate() + day);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      dayOfMonth: date.getDate()
    };
  }

  private runBuyAndHoldStrategy(params: SimulationParams, priceSequence: { day: number; price: number }[]): StrategyResult {
    const dailyData: DailyData[] = [];
    const totalDays = priceSequence.length - 1; // Use actual data length instead of fixed calculation
    let shares = Math.floor(params.initialCapital / params.initialPrice);
    let cash = params.initialCapital - (shares * params.initialPrice);
    let cumulativeDividends = 0;
    let totalTrades = 0;
    let lastDividendDay = -1;

    for (let day = 1; day <= totalDays; day++) {
      const dateInfo = this.getDateInfo(day);
      let currentPrice = 0;
      try {
        currentPrice = priceSequence[day].price;
      } catch (error) {
        console.error('Error fetching price for day:', day);
        console.error('Price data:', priceSequence);
        console.error('Error details:', error);
        throw error;
      }
      const trades: string[] = [];

      let dividends = 0;
      if (dateInfo.dayOfMonth === 15 && day !== lastDividendDay) {
        dividends = shares * params.monthlyDistribution;
        cumulativeDividends += dividends;
        cash += dividends;
        lastDividendDay = day;
      }

      if (cash >= params.cashThreshold) {
        const newShares = Math.floor(cash / currentPrice);
        if (newShares > 0) {
          trades.push(`REINVEST: Buy ${newShares} shares at $${currentPrice.toFixed(2)}`);
          shares += newShares;
          cash -= newShares * currentPrice;
          totalTrades++;
        }
      }
      const totalValue = shares * currentPrice + cash;
      const symbolAllocations: { [symbol: string]: { shares: number; value: number } } = {};
      for (const symbol of params.symbols) {
        symbolAllocations[symbol] = { shares: shares / params.symbols.length, value: (shares * currentPrice) / params.symbols.length };
      }
      dailyData.push({ day, year: dateInfo.year, month: dateInfo.month, dayOfMonth: dateInfo.dayOfMonth, price: currentPrice, shares, cash, totalValue, dividends, cumulativeDividends, trades, symbolAllocations });
    }
    const projectedAnnualDividends = shares * params.monthlyDistribution * 12;
    const symbolResults: { [symbol: string]: { shares: number; value: number; dividends: number } } = {};
    for (const symbol of params.symbols) {
      symbolResults[symbol] = {
        shares: shares / params.symbols.length,
        value: (shares * priceSequence[totalDays].price) / params.symbols.length,
        dividends: cumulativeDividends / params.symbols.length
      };
    }
    return { strategyName: 'Buy and Hold', dailyData, finalShares: shares, finalCash: cash, finalTotalValue: shares * priceSequence[totalDays].price + cash, totalDividendsCollected: cumulativeDividends, projectedAnnualDividends, totalTrades, symbolResults };
  }

  private runTradingStrategy(params: SimulationParams, priceSequence: { day: number; price: number }[]): StrategyResult {
    const dailyData: DailyData[] = [];
    const totalDays = priceSequence.length - 1; // Use actual data length instead of fixed calculation
    let shares = Math.floor(params.initialCapital / params.initialPrice);
    let cash = params.initialCapital - (shares * params.initialPrice);
    let cumulativeDividends = 0;
    let lastBuyPrice = params.initialPrice;
    let totalTrades = 0;
    let pendingBuyBack = false;
    let sellPrice = 0;
    let lastDividendDay = -1;

    for (let day = 1; day <= totalDays; day++) {
      const dateInfo = this.getDateInfo(day);
      const trades: string[] = [];
      let currentPrice = 0;
      try {
        currentPrice = priceSequence[day].price;
      } catch (error) {
        console.error('Error fetching price for day:', day);
        console.error('Price data:', priceSequence);
        console.error('Error details:', error);
        throw error;
      }

      let dividends = 0;
      if (dateInfo.dayOfMonth === 15 && day !== lastDividendDay) {
        dividends = shares * params.monthlyDistribution;
        cumulativeDividends += dividends;
        cash += dividends;
        lastDividendDay = day;
      }

      if (params.gainThreshold > 0 && shares > 0) {
        if (currentPrice >= lastBuyPrice * (1 + params.gainThreshold)) {
          const sellValue = shares * currentPrice;
          trades.push(`SELL ${shares} shares at $${currentPrice.toFixed(2)}`);
          cash += sellValue;
          shares = 0;
          totalTrades++;
          pendingBuyBack = true;
          sellPrice = currentPrice;
        }
      }

      if (pendingBuyBack && shares === 0) {
        let shouldBuyBack = false;
        let buyBackReason = '';

        if (currentPrice < sellPrice) {
          shouldBuyBack = true;
          buyBackReason = `Price dropped to $${currentPrice.toFixed(2)} (was $${sellPrice.toFixed(2)})`;
        } else if (dateInfo.dayOfMonth === 14) {
          shouldBuyBack = true;
          buyBackReason = `Buying back on 14th to collect dividend at $${currentPrice.toFixed(2)}`;
        }

        if (shouldBuyBack) {
          const buyShares = Math.floor(cash / currentPrice);
          if (buyShares > 0) {
            const buyValue = buyShares * currentPrice;
            trades.push(`BUY BACK ${buyShares} shares at $${currentPrice.toFixed(2)} - ${buyBackReason}`);
            shares = buyShares;
            cash -= buyValue;
            lastBuyPrice = currentPrice;
            totalTrades++;
            pendingBuyBack = false;
          }
        }
      }

      if (cash >= params.cashThreshold) {
        const newShares = Math.floor(cash / currentPrice);
        if (newShares > 0) {
          const buyValue = newShares * currentPrice;
          trades.push(`REINVEST: Buy ${newShares} shares at $${currentPrice.toFixed(2)}`);
          shares += newShares;
          cash -= buyValue;
          // Don't update lastBuyPrice on dividend reinvestment
          totalTrades++;
        }
      }
      const totalValue = shares * currentPrice + cash;
      const symbolAllocations: { [symbol: string]: { shares: number; value: number } } = {};
      for (const symbol of params.symbols) {
        symbolAllocations[symbol] = { shares: shares / params.symbols.length, value: (shares * currentPrice) / params.symbols.length };
      }
      dailyData.push({ day, year: dateInfo.year, month: dateInfo.month, dayOfMonth: dateInfo.dayOfMonth, price: currentPrice, shares, cash, totalValue, dividends, cumulativeDividends, trades, symbolAllocations });
    }
    const projectedAnnualDividends = this.calculateProjectedAnnualDividends(symbolShares, symbolData, totalDays);
    const symbolResults: { [symbol: string]: { shares: number; value: number; dividends: number } } = {};
    for (const symbol of params.symbols) {
      symbolResults[symbol] = {
        shares: shares / params.symbols.length,
        value: (shares * priceSequence[totalDays].price) / params.symbols.length,
        dividends: cumulativeDividends / params.symbols.length
      };
    }
    return { strategyName: 'Trading Strategy', dailyData, finalShares: shares, finalCash: cash, finalTotalValue: shares * priceSequence[totalDays].price + cash, totalDividendsCollected: cumulativeDividends, projectedAnnualDividends, totalTrades, symbolResults };
  }

  async runSimulation(params: SimulationParams): Promise<SimulationResult> {
    // Calculate date range for historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - params.simulationYears);

    // For now, use random data generation instead of real EHI data
    // TODO: Yahoo Finance is rate limiting (HTTP 429) - need to implement proper rate limiting or use alternative data source
    const priceSequence = this.generateDailyPriceSequence(params);
    // const priceSequence = await this.fetchHistoricalData('EHI', startDate, endDate);

    const buyAndHold = this.runBuyAndHoldStrategy(params, priceSequence);
    const tradingStrategy = this.runTradingStrategy(params, priceSequence);

    const comparison = {
      tradingVsBuyHold: tradingStrategy.projectedAnnualDividends - buyAndHold.projectedAnnualDividends,
      tradingVsBuyHoldPercent: ((tradingStrategy.projectedAnnualDividends / buyAndHold.projectedAnnualDividends) - 1) * 100
    };

    return {
      buyAndHold,
      tradingStrategy,
      comparison
    };
  }

  async runMultiSymbolSimulation(params: SimulationParams): Promise<SimulationResult> {
    console.log('Fetching historical data for all symbols...');
    const symbolData: { [symbol: string]: { prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] } } = {};

    // Fetch data for each symbol
    for (let i = 0; i < params.symbols.length; i++) {
      const symbol = params.symbols[i];
      console.log(`Fetching data for ${symbol} (${i + 1}/${params.symbols.length})...`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - params.simulationYears);

      symbolData[symbol] = await this.fetchHistoricalData(symbol, startDate, endDate, params.simulationYears);
    }

    // Find the minimum number of days across all symbols
    const totalDays = Math.min(...Object.values(symbolData).map(data => data.prices.length));

    console.log(`Running simulation for ${totalDays} days...`);

    // Run all three strategies
    const buyAndHold = this.runMultiSymbolBuyAndHoldStrategy(params, symbolData, totalDays);
    const tradingStrategy = this.runMultiSymbolTradingStrategy(params, symbolData, totalDays);
    const adjustedBuyAndHold = this.runMultiSymbolAdjustedBuyAndHoldStrategy(params, symbolData, totalDays);

    // Calculate comparisons
    const tradingVsBuyHold = tradingStrategy.projectedAnnualDividends - buyAndHold.projectedAnnualDividends;
    const tradingVsBuyHoldPercent = (tradingVsBuyHold / buyAndHold.projectedAnnualDividends) * 100;
    const adjustedVsBuyHold = adjustedBuyAndHold.projectedAnnualDividends - buyAndHold.projectedAnnualDividends;
    const adjustedVsBuyHoldPercent = (adjustedVsBuyHold / buyAndHold.projectedAnnualDividends) * 100;

    return {
      buyAndHold,
      tradingStrategy,
      adjustedBuyAndHold,
      comparison: {
        tradingVsBuyHold,
        tradingVsBuyHoldPercent,
        adjustedVsBuyHold,
        adjustedVsBuyHoldPercent
      }
    };
  }

  private runMultiSymbolBuyAndHoldStrategy(params: SimulationParams, symbolData: { [symbol: string]: { prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] } }, totalDays: number): StrategyResult {
    const dailyData: DailyData[] = [];
    const symbolShares: { [symbol: string]: number } = {};
    const symbolValues: { [symbol: string]: number } = {};
    const symbolDividends: { [symbol: string]: number } = {};

    // Initialize with equal allocation
    const initialAllocation = params.initialCapital / params.symbols.length;

    for (const symbol of params.symbols) {
      const initialPrice = symbolData[symbol].prices[0].price;
      symbolShares[symbol] = Math.floor(initialAllocation / initialPrice);
      symbolValues[symbol] = symbolShares[symbol] * initialPrice;
      symbolDividends[symbol] = 0;
    }

    let cash = params.initialCapital - Object.values(symbolValues).reduce((sum, value) => sum + value, 0);
    let cumulativeDividends = 0;
    let totalTrades = 0;
    let lastDividendDay = -1;

    for (let day = 1; day <= totalDays; day++) {
      const dateInfo = this.getDateInfo(day);
      const trades: string[] = [];
      let totalValue = cash;

      // Update prices and collect dividends for each symbol
      for (const symbol of params.symbols) {
        const currentPrice = symbolData[symbol].prices[day]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
        symbolValues[symbol] = symbolShares[symbol] * currentPrice;
        totalValue += symbolValues[symbol];

        // Check for dividends
        const symbolDividend = symbolData[symbol].dividends.find(d => d.day === day);
        if (symbolDividend) {
          const dividendAmount = symbolShares[symbol] * symbolDividend.amount;
          symbolDividends[symbol] += dividendAmount;
          cumulativeDividends += dividendAmount;
          cash += dividendAmount;
          trades.push(`${symbol}: Collected $${dividendAmount.toFixed(2)} dividend`);
        }
      }

      // Rebalancing logic: split investment equally between symbols
      if (cash >= params.cashThreshold) {
        const investmentPerSymbol = Math.floor(cash / params.symbols.length);

        for (const symbol of params.symbols) {
          const currentPrice = symbolData[symbol].prices[day]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
          const newShares = Math.floor(investmentPerSymbol / currentPrice);
          if (newShares > 0) {
            symbolShares[symbol] += newShares;
            symbolValues[symbol] = symbolShares[symbol] * currentPrice;
            cash -= newShares * currentPrice;
            totalTrades++;
            trades.push(`REINVEST: Buy ${newShares} shares of ${symbol} at $${currentPrice.toFixed(2)}`);
          }
        }
      }

      const symbolAllocations: { [symbol: string]: { shares: number; value: number } } = {};
      for (const symbol of params.symbols) {
        symbolAllocations[symbol] = { shares: symbolShares[symbol], value: symbolValues[symbol] };
      }

      dailyData.push({
        day,
        year: dateInfo.year,
        month: dateInfo.month,
        dayOfMonth: dateInfo.dayOfMonth,
        price: 0, // Average price across symbols
        shares: Object.values(symbolShares).reduce((sum, shares) => sum + shares, 0),
        cash,
        totalValue,
        dividends: 0, // Daily dividends are handled per symbol
        cumulativeDividends,
        trades,
        symbolAllocations
      });
    }

    const symbolResults: { [symbol: string]: { shares: number; value: number; dividends: number } } = {};
    let finalTotalValue = cash;
    for (const symbol of params.symbols) {
      const finalPrice = symbolData[symbol].prices[totalDays - 1].price;
      const symbolValue = symbolShares[symbol] * finalPrice;
      finalTotalValue += symbolValue;
      symbolResults[symbol] = {
        shares: symbolShares[symbol],
        value: symbolValue,
        dividends: symbolDividends[symbol]
      };
    }

    const projectedAnnualDividends = cumulativeDividends * (365 / totalDays);
    return {
      strategyName: 'Multi-Symbol Buy and Hold',
      dailyData,
      finalShares: Object.values(symbolShares).reduce((sum, shares) => sum + shares, 0),
      finalCash: cash,
      finalTotalValue,
      totalDividendsCollected: cumulativeDividends,
      projectedAnnualDividends,
      totalTrades,
      symbolResults
    };
  }

  private runMultiSymbolTradingStrategy(params: SimulationParams, symbolData: { [symbol: string]: { prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] } }, totalDays: number): StrategyResult {
    const dailyData: DailyData[] = [];
    const symbolShares: { [symbol: string]: number } = {};
    const symbolValues: { [symbol: string]: number } = {};
    const symbolDividends: { [symbol: string]: number } = {};
    const symbolLastBuyPrices: { [symbol: string]: number } = {};
    const symbolPendingBuyBack: { [symbol: string]: boolean } = {};
    const symbolSoldShares: { [symbol: string]: number } = {};
    const symbolSoldLots: { [symbol: string]: { shares: number; sellPrice: number; sellDay: number }[] } = {};
    const symbolLots: { [symbol: string]: { shares: number; buyPrice: number; buyDay: number }[] } = {};

    // Initialize tracking variables for each symbol
    for (const symbol of params.symbols) {
      symbolShares[symbol] = 0;
      symbolValues[symbol] = 0;
      symbolDividends[symbol] = 0;
      symbolLastBuyPrices[symbol] = 0;
      symbolPendingBuyBack[symbol] = false;
      symbolSoldShares[symbol] = 0;
      symbolSoldLots[symbol] = [];
      symbolLots[symbol] = [];
    }

    let cash = params.initialCapital;
    let cumulativeDividends = 0;
    let totalTrades = 0;
    let lastDividendDay = -1;

    // Initial allocation - invest in symbols with 10%+ yield
    let remainingCash = params.initialCapital;
    const initialAllocation = params.initialCapital / params.symbols.length;

    // Find symbols with 10%+ yield for initial investment
    const eligibleSymbols = params.symbols.filter(symbol => {
      const initialPrice = symbolData[symbol].prices[0].price;
      const yieldRate = this.calculateYield(symbol, { [symbol]: Math.floor(initialAllocation / initialPrice) }, symbolData, 0);
      return yieldRate >= 10;
    });

    console.log(`Initial allocation - Found ${eligibleSymbols.length} symbols with 10%+ yield out of ${params.symbols.length} total symbols`);
    if (eligibleSymbols.length === 0) {
      console.log('No symbols meet 10% yield requirement for initial allocation - will wait for yield improvement');
    }

    if (eligibleSymbols.length > 0) {
      // Invest equally in eligible symbols
      const investmentPerSymbol = Math.floor(remainingCash / eligibleSymbols.length);

      for (const symbol of eligibleSymbols) {
        const initialPrice = symbolData[symbol].prices[0].price;
        const newShares = Math.floor(investmentPerSymbol / initialPrice);

        if (newShares > 0) {
          symbolShares[symbol] = newShares;
          symbolValues[symbol] = newShares * initialPrice;
          symbolLastBuyPrices[symbol] = initialPrice;

          // Add initial lot
          symbolLots[symbol].push({
            shares: newShares,
            buyPrice: initialPrice,
            buyDay: 0
          });

          remainingCash -= newShares * initialPrice;
          totalTrades++;
        }
      }
    }

    cash = remainingCash;

    for (let day = 1; day <= totalDays; day++) {
      const dateInfo = this.getDateInfo(day);
      const trades: string[] = [];
      let totalValue = cash;

      // Update prices and collect dividends for each symbol
      for (const symbol of params.symbols) {
        const currentPrice = symbolData[symbol].prices[day]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
        symbolValues[symbol] = symbolShares[symbol] * currentPrice;
        totalValue += symbolValues[symbol];

        // Check for dividends
        const symbolDividend = symbolData[symbol].dividends.find(d => d.day === day);
        if (symbolDividend) {
          const dividendAmount = symbolShares[symbol] * symbolDividend.amount;
          symbolDividends[symbol] += dividendAmount;
          cumulativeDividends += dividendAmount;
          cash += dividendAmount;
          trades.push(`${symbol}: Collected $${dividendAmount.toFixed(2)} dividend`);
        }

        // Trading logic for each symbol - check each lot individually
        if (params.gainThreshold > 0 && symbolLots[symbol].length > 0) {
          const lotsToSell: { lotIndex: number; shares: number; sellPrice: number }[] = [];

          // Check each lot for gain threshold
          for (let i = 0; i < symbolLots[symbol].length; i++) {
            const lot = symbolLots[symbol][i];
            if (currentPrice >= lot.buyPrice * (1 + params.gainThreshold)) {
              lotsToSell.push({
                lotIndex: i,
                shares: lot.shares,
                sellPrice: currentPrice
              });
            }
          }

          // Sell lots that have achieved the gain
          if (lotsToSell.length > 0) {
            console.log(`Day ${day}: ${symbol} selling ${lotsToSell.length} lots with gain threshold ${(params.gainThreshold * 100).toFixed(1)}%`);
            let totalSharesSold = 0;
            let totalSellValue = 0;

            // Sell lots in reverse order to avoid index shifting
            for (let i = lotsToSell.length - 1; i >= 0; i--) {
              const lotToSell = lotsToSell[i];
              const lotIndex = lotToSell.lotIndex;
              const lot = symbolLots[symbol][lotIndex];

              totalSharesSold += lot.shares;
              totalSellValue += lot.shares * lotToSell.sellPrice;

              // Add to sold lots tracking
              symbolSoldLots[symbol].push({
                shares: lot.shares,
                sellPrice: lotToSell.sellPrice,
                sellDay: day
              });

              // Remove the lot
              symbolLots[symbol].splice(lotIndex, 1);
            }

            trades.push(`${symbol}: SELL ${totalSharesSold} shares at $${currentPrice.toFixed(2)} (${lotsToSell.length} lots)`);

            // Add 1/10th of sale proceeds to available cash for rebalancing
            const rebalancingCash = totalSellValue * 0.1;
            cash += totalSellValue - rebalancingCash; // Keep 90% of proceeds
            const availableRebalancingCash = rebalancingCash;

            symbolShares[symbol] -= totalSharesSold;
            symbolValues[symbol] = symbolShares[symbol] * currentPrice;
            totalTrades++;
            symbolPendingBuyBack[symbol] = true;
            symbolSoldShares[symbol] += totalSharesSold;

            // Check if symbol should exit pool due to low yield
            const currentYield = this.calculateYield(symbol, symbolShares, symbolData, day);
            if (currentYield < 10 && symbolShares[symbol] > 0) {
              trades.push(`EXITED pool: ${symbol} yield dropped to ${currentYield.toFixed(1)}%`);
            }

            // Use rebalancing cash to buy other symbols if available
            if (availableRebalancingCash >= 2000) {
              // Find symbols with 10%+ yield that are not in our pool
              const eligibleSymbols = params.symbols.filter(s => {
                const yieldRate = this.calculateYield(s, symbolShares, symbolData, day);
                const inPool = this.isSymbolInPool(s, symbolShares);
                return yieldRate >= 10 && !inPool && s !== symbol;
              });

              if (eligibleSymbols.length > 0) {
                // Find the least invested symbols among eligible ones
                const leastInvestedSymbols = eligibleSymbols
                  .map(s => ({ symbol: s, value: symbolValues[s] }))
                  .sort((a, b) => a.value - b.value);

                // Invest $2000 increments in least invested eligible symbols
                let remainingRebalancingCash = availableRebalancingCash;
                const investmentAmount = 2000;

                for (const { symbol: targetSymbol } of leastInvestedSymbols) {
                  if (remainingRebalancingCash >= investmentAmount) {
                    const targetPrice = symbolData[targetSymbol].prices[day]?.price || symbolData[targetSymbol].prices[symbolData[targetSymbol].prices.length - 1].price;
                    const newShares = Math.floor(investmentAmount / targetPrice);

                    if (newShares > 0) {
                      // Add new lot for new investment
                      symbolLots[targetSymbol].push({
                        shares: newShares,
                        buyPrice: targetPrice,
                        buyDay: day
                      });

                      symbolShares[targetSymbol] += newShares;
                      symbolValues[targetSymbol] = symbolShares[targetSymbol] * targetPrice;
                      remainingRebalancingCash -= newShares * targetPrice;
                      totalTrades++;
                      trades.push(`REBALANCE: Buy ${newShares} shares of ${targetSymbol} at $${targetPrice.toFixed(2)} (yield: ${this.calculateYield(targetSymbol, symbolShares, symbolData, day).toFixed(1)}%)`);
                    }
                  }
                }
                cash += remainingRebalancingCash; // Add any unused rebalancing cash back
              } else {
                cash += availableRebalancingCash; // No eligible symbols, add back to cash
              }
            } else {
              cash += availableRebalancingCash; // Not enough for investment, add back to cash
            }
          }
        }

        // Buy back logic - buy back whenever we have sold shares
        if (symbolSoldShares[symbol] > 0) {
          let shouldBuyBack = false;
          let buyBackReason = '';

          // Check if there's a dividend tomorrow (ex-date)
          const tomorrowDividend = symbolData[symbol].dividends.find(d => d.day === day + 1);

          // Check if current price is below any of our sold lot prices
          const hasPriceDrop = symbolSoldLots[symbol].some(soldLot => currentPrice < soldLot.sellPrice);

          // Check if current price has gone up another 1% from any sold lot price
          const hasPriceIncrease = symbolSoldLots[symbol].some(soldLot => currentPrice >= soldLot.sellPrice * 1.01);

          if (hasPriceDrop) {
            shouldBuyBack = true;
            buyBackReason = `Price dropped to $${currentPrice.toFixed(2)} (below sell prices)`;
          } else if (tomorrowDividend) {
            shouldBuyBack = true;
            buyBackReason = `Buying back day before ex-date to collect dividend at $${currentPrice.toFixed(2)}`;
          } else if (hasPriceIncrease) {
            shouldBuyBack = true;
            buyBackReason = `Price increased 1% to $${currentPrice.toFixed(2)} (above sell prices)`;
          }

          if (shouldBuyBack) {
            // Buy back as many shares as we can afford, even if not all
            const sharesToBuyBack = symbolSoldShares[symbol];
            const affordableShares = Math.floor(cash / currentPrice);
            const buyShares = Math.min(sharesToBuyBack, affordableShares);

            if (buyShares > 0) {
              const buyValue = buyShares * currentPrice;
              trades.push(`${symbol}: BUY BACK ${buyShares} shares at $${currentPrice.toFixed(2)} - ${buyBackReason}`);

              // Add new lot for bought back shares
              symbolLots[symbol].push({
                shares: buyShares,
                buyPrice: currentPrice,
                buyDay: day
              });

              symbolShares[symbol] += buyShares;
              symbolValues[symbol] = symbolShares[symbol] * currentPrice;
              cash -= buyValue;
              symbolLastBuyPrices[symbol] = currentPrice;
              symbolSoldShares[symbol] -= buyShares; // Reduce sold shares count
              totalTrades++;

              // Only mark as not pending if we bought back ALL shares
              if (symbolSoldShares[symbol] === 0) {
                symbolPendingBuyBack[symbol] = false;
              } else {
                // Still have shares to buy back later
                console.log(`Day ${day}: ${symbol} bought back ${buyShares} shares, still need ${symbolSoldShares[symbol]} more`);
              }
            }
          }
        }
        // Check if sold symbols should re-enter pool due to improved yield
        if (symbolSoldShares[symbol] > 0) {
          const currentYield = this.calculateYield(symbol, symbolShares, symbolData, day);
          if (currentYield >= 10) {
            // Symbol has improved yield, try to buy back more aggressively
            const sharesToBuyBack = symbolSoldShares[symbol];
            const affordableShares = Math.floor(cash / currentPrice);
            const buyShares = Math.min(sharesToBuyBack, affordableShares);

            if (buyShares > 0) {
              const buyValue = buyShares * currentPrice;
              trades.push(`${symbol}: RE-ENTERING pool: Buy back ${buyShares} shares at $${currentPrice.toFixed(2)} (yield: ${currentYield.toFixed(1)}%)`);

              // Add new lot for bought back shares
              symbolLots[symbol].push({
                shares: buyShares,
                buyPrice: currentPrice,
                buyDay: day
              });

              symbolShares[symbol] += buyShares;
              symbolValues[symbol] = symbolShares[symbol] * currentPrice;
              cash -= buyValue;
              symbolLastBuyPrices[symbol] = currentPrice;
              symbolSoldShares[symbol] -= buyShares;
              totalTrades++;

              if (symbolSoldShares[symbol] === 0) {
                symbolPendingBuyBack[symbol] = false;
              }
            }
          }
        }
      }

      // Rebalancing logic: FIRST buy back sold shares, THEN make new investments
      if (cash >= params.cashThreshold) {
        // First, try to buy back any sold shares for each symbol
        for (const symbol of params.symbols) {
          if (symbolSoldShares[symbol] > 0 && symbolPendingBuyBack[symbol]) {
            const currentPrice = symbolData[symbol].prices[day]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
            const sharesToBuyBack = symbolSoldShares[symbol];
            const affordableShares = Math.floor(cash / currentPrice);
            const buyShares = Math.min(sharesToBuyBack, affordableShares);

            if (buyShares > 0) {
              const buyValue = buyShares * currentPrice;
              trades.push(`${symbol}: BUY BACK ${buyShares} shares at $${currentPrice.toFixed(2)} - REBALANCING`);

              // Add new lot for bought back shares
              symbolLots[symbol].push({
                shares: buyShares,
                buyPrice: currentPrice,
                buyDay: day
              });

              symbolShares[symbol] += buyShares;
              symbolValues[symbol] = symbolShares[symbol] * currentPrice;
              cash -= buyValue;
              symbolLastBuyPrices[symbol] = currentPrice;
              symbolSoldShares[symbol] -= buyShares;
              totalTrades++;

              if (symbolSoldShares[symbol] === 0) {
                symbolPendingBuyBack[symbol] = false;
              } else {
                console.log(`Day ${day}: ${symbol} bought back ${buyShares} shares during rebalancing, still need ${symbolSoldShares[symbol]} more`);
              }
            }
          }
        }

        // Then, make new investments with remaining cash - yield-based strategy
        if (cash >= params.cashThreshold) {
          // Find symbols with 10%+ yield that are not in our pool
          const eligibleSymbols = params.symbols.filter(symbol => {
            const yieldRate = this.calculateYield(symbol, symbolShares, symbolData, day);
            const inPool = this.isSymbolInPool(symbol, symbolShares);
            return yieldRate >= 10 && !inPool;
          });

          if (eligibleSymbols.length > 0) {
            console.log(`Day ${day}: Found ${eligibleSymbols.length} symbols with 10%+ yield ready to enter pool`);
          }

          if (eligibleSymbols.length > 0) {
            // Find the least invested symbols among eligible ones
            const leastInvestedSymbols = eligibleSymbols
              .map(symbol => ({ symbol, value: symbolValues[symbol] }))
              .sort((a, b) => a.value - b.value);

            // Invest $2000 increments in least invested eligible symbols
            let remainingCash = cash;
            const investmentAmount = 2000;

            for (const { symbol } of leastInvestedSymbols) {
              if (remainingCash >= investmentAmount) {
                const currentPrice = symbolData[symbol].prices[day]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
                const newShares = Math.floor(investmentAmount / currentPrice);

                if (newShares > 0) {
                  // Add new lot for new investment
                  symbolLots[symbol].push({
                    shares: newShares,
                    buyPrice: currentPrice,
                    buyDay: day
                  });

                  symbolShares[symbol] += newShares;
                  symbolValues[symbol] = symbolShares[symbol] * currentPrice;
                  remainingCash -= newShares * currentPrice;
                  totalTrades++;
                  trades.push(`ENTERED pool: Buy ${newShares} shares of ${symbol} at $${currentPrice.toFixed(2)} (yield: ${this.calculateYield(symbol, symbolShares, symbolData, day).toFixed(1)}%)`);
                }
              }
            }
            cash = remainingCash;
          }
        }
      }

      const symbolAllocations: { [symbol: string]: { shares: number; value: number } } = {};
      for (const symbol of params.symbols) {
        symbolAllocations[symbol] = { shares: symbolShares[symbol], value: symbolValues[symbol] };
      }

      dailyData.push({
        day,
        year: dateInfo.year,
        month: dateInfo.month,
        dayOfMonth: dateInfo.dayOfMonth,
        price: 0, // Average price across symbols
        shares: Object.values(symbolShares).reduce((sum, shares) => sum + shares, 0),
        cash,
        totalValue,
        dividends: 0, // Daily dividends are handled per symbol
        cumulativeDividends,
        trades,
        symbolAllocations
      });
    }

    const symbolResults: { [symbol: string]: { shares: number; value: number; dividends: number } } = {};
    let finalTotalValue = cash;
    for (const symbol of params.symbols) {
      const finalPrice = symbolData[symbol].prices[totalDays - 1].price;
      const symbolValue = symbolShares[symbol] * finalPrice;
      finalTotalValue += symbolValue;
      symbolResults[symbol] = {
        shares: symbolShares[symbol],
        value: symbolValue,
        dividends: symbolDividends[symbol]
      };
    }

    // Calculate projected annual dividends based on current holdings
    let projectedAnnualDividends = 0;
    for (const symbol of params.symbols) {
      const finalPrice = symbolData[symbol].prices[totalDays]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
      const finalShares = symbolShares[symbol];

      // Calculate annual dividend rate for this symbol
      const symbolDividendRate = this.calculateYield(symbol, symbolShares, symbolData, totalDays) / 100;
      const annualDividendPerShare = finalPrice * symbolDividendRate;

      projectedAnnualDividends += finalShares * annualDividendPerShare;
    }

    return {
      strategyName: 'Multi-Symbol Trading Strategy',
      dailyData,
      finalShares: Object.values(symbolShares).reduce((sum, shares) => sum + shares, 0),
      finalCash: cash,
      finalTotalValue,
      totalDividendsCollected: cumulativeDividends,
      projectedAnnualDividends,
      totalTrades,
      symbolResults
    };
  }

  private runMultiSymbolAdjustedBuyAndHoldStrategy(params: SimulationParams, symbolData: { [symbol: string]: { prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] } }, totalDays: number): StrategyResult {
    const dailyData: DailyData[] = [];
    const symbolShares: { [symbol: string]: number } = {};
    const symbolValues: { [symbol: string]: number } = {};
    const symbolDividends: { [symbol: string]: number } = {};
    const symbolLots: { [symbol: string]: { shares: number; buyPrice: number; buyDay: number }[] } = {};

    // Initialize with equal allocation (like buy & hold)
    const initialAllocation = params.initialCapital / params.symbols.length;

    for (const symbol of params.symbols) {
      const initialPrice = symbolData[symbol].prices[0].price;
      symbolShares[symbol] = Math.floor(initialAllocation / initialPrice);
      symbolValues[symbol] = symbolShares[symbol] * initialPrice;
      symbolDividends[symbol] = 0;
      symbolLots[symbol] = [{
        shares: symbolShares[symbol],
        buyPrice: initialPrice,
        buyDay: 0
      }];
    }

    let cash = params.initialCapital - Object.values(symbolValues).reduce((sum, value) => sum + value, 0);
    let cumulativeDividends = 0;
    let totalTrades = 0;
    let lastDividendDay = -1;

    for (let day = 1; day <= totalDays; day++) {
      const dateInfo = this.getDateInfo(day);
      const trades: string[] = [];
      let totalValue = cash;

      // Update prices and collect dividends for each symbol
      for (const symbol of params.symbols) {
        const currentPrice = symbolData[symbol].prices[day]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
        symbolValues[symbol] = symbolShares[symbol] * currentPrice;
        totalValue += symbolValues[symbol];

        // Check for dividends
        const symbolDividend = symbolData[symbol].dividends.find(d => d.day === day);
        if (symbolDividend) {
          const dividendAmount = symbolShares[symbol] * symbolDividend.amount;
          symbolDividends[symbol] += dividendAmount;
          cumulativeDividends += dividendAmount;
          cash += dividendAmount;
          trades.push(`${symbol}: Collected $${dividendAmount.toFixed(2)} dividend`);
        }

        // Check for lots to sell (yield < 10% AND price > buy price)
        if (symbolLots[symbol].length > 0) {
          const lotsToSell: { lotIndex: number; shares: number; sellPrice: number }[] = [];

          // Check each lot
          for (let i = 0; i < symbolLots[symbol].length; i++) {
            const lot = symbolLots[symbol][i];
            const currentYield = this.calculateYield(symbol, symbolShares, symbolData, day);

            // Sell if yield < 10% AND price > buy price
            if (currentYield < 10 && currentPrice > lot.buyPrice) {
              lotsToSell.push({
                lotIndex: i,
                shares: lot.shares,
                sellPrice: currentPrice
              });
            }
          }

          // Sell lots that meet criteria
          if (lotsToSell.length > 0) {
            let totalSharesSold = 0;
            let totalSellValue = 0;

            // Sell lots in reverse order to avoid index shifting
            for (let i = lotsToSell.length - 1; i >= 0; i--) {
              const lotToSell = lotsToSell[i];
              const lotIndex = lotToSell.lotIndex;
              const lot = symbolLots[symbol][lotIndex];

              totalSharesSold += lot.shares;
              totalSellValue += lot.shares * lotToSell.sellPrice;

              // Remove the lot
              symbolLots[symbol].splice(lotIndex, 1);
            }

            trades.push(`${symbol}: SELL ${totalSharesSold} shares at $${currentPrice.toFixed(2)} (yield: ${this.calculateYield(symbol, symbolShares, symbolData, day).toFixed(1)}%, price > buy price)`);
            cash += totalSellValue;
            symbolShares[symbol] -= totalSharesSold;
            symbolValues[symbol] = symbolShares[symbol] * currentPrice;
            totalTrades++;
          }
        }
      }

      // Rebalancing logic: reinvest cash in symbols with 10%+ yield
      if (cash >= params.cashThreshold) {
        // First, try to invest in symbols with 10%+ yield that are not in our pool (0 shares)
        const eligibleZeroShareSymbols = params.symbols.filter(symbol => {
          const yieldRate = this.calculateYield(symbol, symbolShares, symbolData, day);
          const inPool = this.isSymbolInPool(symbol, symbolShares);
          return yieldRate >= 10 && !inPool;
        });

        // Then, consider symbols with 10%+ yield that are already in our pool
        const eligibleExistingSymbols = params.symbols.filter(symbol => {
          const yieldRate = this.calculateYield(symbol, symbolShares, symbolData, day);
          const inPool = this.isSymbolInPool(symbol, symbolShares);
          return yieldRate >= 10 && inPool;
        });

        // Combine lists, prioritizing zero-share symbols
        const allEligibleSymbols = [...eligibleZeroShareSymbols, ...eligibleExistingSymbols];

        if (allEligibleSymbols.length > 0) {
          // Find the least invested symbols among eligible ones
          const leastInvestedSymbols = allEligibleSymbols
            .map(symbol => ({ symbol, value: symbolValues[symbol] }))
            .sort((a, b) => a.value - b.value);

          // Invest $2000 increments in least invested eligible symbols
          let remainingCash = cash;
          const investmentAmount = 2000;

          for (const { symbol } of leastInvestedSymbols) {
            if (remainingCash >= investmentAmount) {
              const currentPrice = symbolData[symbol].prices[day]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
              const newShares = Math.floor(investmentAmount / currentPrice);

              if (newShares > 0) {
                // Add new lot for new investment
                symbolLots[symbol].push({
                  shares: newShares,
                  buyPrice: currentPrice,
                  buyDay: day
                });

                symbolShares[symbol] += newShares;
                symbolValues[symbol] = symbolShares[symbol] * currentPrice;
                remainingCash -= newShares * currentPrice;
                totalTrades++;
                trades.push(`REINVEST: Buy ${newShares} shares of ${symbol} at $${currentPrice.toFixed(2)} (yield: ${this.calculateYield(symbol, symbolShares, symbolData, day).toFixed(1)}%)`);
              }
            }
          }
          cash = remainingCash;
        }
      }

      const symbolAllocations: { [symbol: string]: { shares: number; value: number } } = {};
      for (const symbol of params.symbols) {
        symbolAllocations[symbol] = { shares: symbolShares[symbol], value: symbolValues[symbol] };
      }

      dailyData.push({
        day,
        year: dateInfo.year,
        month: dateInfo.month,
        dayOfMonth: dateInfo.dayOfMonth,
        price: 0, // Average price across symbols
        shares: Object.values(symbolShares).reduce((sum, shares) => sum + shares, 0),
        cash,
        totalValue,
        dividends: 0, // Daily dividends are handled per symbol
        cumulativeDividends,
        trades,
        symbolAllocations
      });
    }

    const symbolResults: { [symbol: string]: { shares: number; value: number; dividends: number } } = {};
    let finalTotalValue = cash;
    for (const symbol of params.symbols) {
      const finalPrice = symbolData[symbol].prices[totalDays - 1].price;
      const symbolValue = symbolShares[symbol] * finalPrice;
      finalTotalValue += symbolValue;
      symbolResults[symbol] = {
        shares: symbolShares[symbol],
        value: symbolValue,
        dividends: symbolDividends[symbol]
      };
    }

    const projectedAnnualDividends = cumulativeDividends * (365 / totalDays);
    return {
      strategyName: 'Multi-Symbol Adjusted Buy and Hold',
      dailyData,
      finalShares: Object.values(symbolShares).reduce((sum, shares) => sum + shares, 0),
      finalCash: cash,
      finalTotalValue,
      totalDividendsCollected: cumulativeDividends,
      projectedAnnualDividends,
      totalTrades,
      symbolResults
    };
  }

  private calculateYield(symbol: string, symbolShares: { [symbol: string]: number }, symbolData: { [symbol: string]: { prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] } }, day: number): number {
    const currentPrice = symbolData[symbol].prices[day]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
    const shares = symbolShares[symbol];

    if (shares === 0 || currentPrice === 0) return 0;

    // Calculate annual dividends based on actual dividend data
    const dividends = symbolData[symbol].dividends;
    if (dividends.length === 0) return 0;

    // Use the first dividend to estimate annual yield
    const firstDividend = dividends[0];
    const annualDividends = shares * firstDividend.amount * 12; // Assume monthly dividends
    const currentValue = shares * currentPrice;

    return (annualDividends / currentValue) * 100;
  }

  private isSymbolInPool(symbol: string, symbolShares: { [symbol: string]: number }): boolean {
    return symbolShares[symbol] > 0;
  }

  private selectSymbolToInvest(symbols: string[], symbolValues: { [symbol: string]: number }, availableCash: number): string | null {
    // Find symbol with lowest invested value
    const minValue = Math.min(...Object.values(symbolValues));
    const candidates = symbols.filter(symbol => symbolValues[symbol] === minValue);

    if (candidates.length === 1) {
      return candidates[0];
    }

    // In case of tie, select the one with higher yield (for now, just pick the first one)
    // TODO: Implement actual yield calculation
    return candidates[0];
  }

  private calculateProjectedAnnualDividends(symbolShares: { [symbol: string]: number }, symbolData: { [symbol: string]: { prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] } }, totalDays: number): number {
    let projectedAnnualDividends = 0;
    for (const symbol of Object.keys(symbolShares)) {
      const finalPrice = symbolData[symbol].prices[totalDays]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
      const finalShares = symbolShares[symbol];

      // Calculate annual dividend rate for this symbol
      const symbolDividendRate = this.calculateYield(symbol, symbolShares, symbolData, totalDays) / 100;
      const annualDividendPerShare = finalPrice * symbolDividendRate;

      projectedAnnualDividends += finalShares * annualDividendPerShare;
    }
    return projectedAnnualDividends;
  }
}

// Main execution
async function main() {
  const simulation = new TradingSimulation();

  const baseParams: SimulationParams = {
    initialCapital: 1000000,
    cashThreshold: 2000,
    gainThreshold: 0.0,
    simulationYears: 5,
    symbols: simulation.symbols
  };

  console.log('\n=== Multi-Symbol CEF Trading Strategy Simulation ===');
  console.log('\nParameters:');
  console.log(`Initial Capital: $${baseParams.initialCapital.toLocaleString()}`);
  console.log(`Cash Threshold: $${baseParams.cashThreshold.toLocaleString()}`);
  console.log(`Simulation Years: ${baseParams.simulationYears}`);
  console.log(`Symbols: ${baseParams.symbols.join(', ')}`);
  console.log('');

  // Test different gain thresholds
  const gainThresholds = [0.005, 0.01, 0.02, 0.03, 0.04, 0.05]; // 0.5%, 1%, 2%, 3%, 4%, 5%
  const results: { gainThreshold: number; tradingVsBuyHold: number; tradingVsBuyHoldPercent: number; adjustedVsBuyHold: number; adjustedVsBuyHoldPercent: number; tradingVsAdjusted: number; tradingVsAdjustedPercent: number }[] = [];

  for (const gainThreshold of gainThresholds) {
    console.log(`\n=== RUNNING SIMULATION WITH ${(gainThreshold * 100).toFixed(1)}% GAIN THRESHOLD ===`);

    const params = { ...baseParams, gainThreshold };
    console.log(`DEBUG: gainThreshold = ${gainThreshold}, params.gainThreshold = ${params.gainThreshold}`);
    const result = await simulation.runMultiSymbolSimulation(params);

    // Add debugging output
    console.log(`Trading Strategy - Total Trades: ${result.tradingStrategy.totalTrades}`);
    console.log(`Adjusted Strategy - Total Trades: ${result.adjustedBuyAndHold.totalTrades}`);
    console.log(`Trading Strategy - Final Shares: ${result.tradingStrategy.finalShares}`);
    console.log(`Adjusted Strategy - Final Shares: ${result.adjustedBuyAndHold.finalShares}`);

    // Calculate direct comparison between Trading and Adjusted
    const tradingVsAdjusted = result.tradingStrategy.projectedAnnualDividends - result.adjustedBuyAndHold.projectedAnnualDividends;
    const tradingVsAdjustedPercent = (tradingVsAdjusted / result.adjustedBuyAndHold.projectedAnnualDividends) * 100;

    results.push({
      gainThreshold,
      tradingVsBuyHold: result.comparison.tradingVsBuyHold,
      tradingVsBuyHoldPercent: result.comparison.tradingVsBuyHoldPercent,
      adjustedVsBuyHold: result.comparison.adjustedVsBuyHold,
      adjustedVsBuyHoldPercent: result.comparison.adjustedVsBuyHoldPercent,
      tradingVsAdjusted,
      tradingVsAdjustedPercent
    });
  }

  // Display results table
  console.log('\n=== COMPARISON RESULTS ===');
  console.log('');
  console.log('Gain Threshold | Trading vs Buy & Hold | Adjusted vs Buy & Hold | Trading vs Adjusted');
  console.log('---------------|----------------------|------------------------|-------------------');

  for (const result of results) {
    const gainPercent = (result.gainThreshold * 100).toFixed(1);
    const tradingVsBuyHold = result.tradingVsBuyHoldPercent.toFixed(2);
    const adjustedVsBuyHold = result.adjustedVsBuyHoldPercent.toFixed(2);
    const tradingVsAdjusted = result.tradingVsAdjustedPercent.toFixed(2);

    console.log(`${gainPercent.padStart(6)}%      | ${tradingVsBuyHold.padStart(8)}%        | ${adjustedVsBuyHold.padStart(10)}%          | ${tradingVsAdjusted.padStart(8)}%`);
  }

  console.log('');

  // Find best performing strategy
  const bestTradingVsBuyHold = results.reduce((best, current) =>
    current.tradingVsBuyHoldPercent > best.tradingVsBuyHoldPercent ? current : best
  );

  const bestAdjustedVsBuyHold = results.reduce((best, current) =>
    current.adjustedVsBuyHoldPercent > best.adjustedVsBuyHoldPercent ? current : best
  );

  const bestTradingVsAdjusted = results.reduce((best, current) =>
    current.tradingVsAdjustedPercent > best.tradingVsAdjustedPercent ? current : best
  );

  console.log('=== BEST PERFORMING CONFIGURATIONS ===');
  console.log(`Best Trading vs Buy & Hold: ${(bestTradingVsBuyHold.gainThreshold * 100).toFixed(1)}% threshold (${bestTradingVsBuyHold.tradingVsBuyHoldPercent.toFixed(2)}%)`);
  console.log(`Best Adjusted vs Buy & Hold: ${(bestAdjustedVsBuyHold.gainThreshold * 100).toFixed(1)}% threshold (${bestAdjustedVsBuyHold.adjustedVsBuyHoldPercent.toFixed(2)}%)`);
  console.log(`Best Trading vs Adjusted: ${(bestTradingVsAdjusted.gainThreshold * 100).toFixed(1)}% threshold (${bestTradingVsAdjusted.tradingVsAdjustedPercent.toFixed(2)}%)`);
  console.log('');
}

// Run the simulation
main().catch(console.error);
