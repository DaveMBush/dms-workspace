import axios from 'axios';
import yahooFinance from 'yahoo-finance2';

// Cache for historical data to avoid refetching
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface SimulationParams {
  initialCapital: number;
  monthlyDistribution: number;
  initialPrice: number;
  gainThreshold: number;
  cashThreshold: number;
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
  comparison: {
    tradingVsBuyHold: number;
    tradingVsBuyHoldPercent: number;
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

  private async fetchHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<{ prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] }> {
    try {
      console.log(`Fetching ${symbol} historical data...`);
      console.log(`Date range: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`);

      // Check cache
      const cachedData = dataCache.get(`${symbol}-${startDate.toISOString()}-${endDate.toISOString()}`);
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        console.log(`Using cached data for ${symbol}`);
        return cachedData.data;
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout fetching ${symbol} data`)), 15000);
      });

      const dataPromise = yahooFinance.chart(symbol, {
        period1: startDate.toISOString().slice(0, 10),
        period2: endDate.toISOString().slice(0, 10),
        interval: '1d',
        events: 'dividends' // Include dividend events
      });

      console.log(`Making API call to yahoo-finance2 for ${symbol}...`);
      const result = await Promise.race([dataPromise, timeoutPromise]) as any;
      console.log(`API call completed successfully for ${symbol}`);

      if (!result.quotes || result.quotes.length === 0) {
        throw new Error(`No data received from Yahoo Finance for ${symbol}`);
      }

      console.log(`Fetched ${result.quotes.length} days of ${symbol} data`);
      if (result.quotes.length > 0) {
        console.log('Sample data structure:', {
          date: result.quotes[0].date,
          close: result.quotes[0].close,
          open: result.quotes[0].open,
          high: result.quotes[0].high,
          low: result.quotes[0].low
        });
      }

      // Process price data
      const prices: { day: number; price: number }[] = [];
      for (let i = 0; i < result.quotes.length; i++) {
        const dayData = result.quotes[i];
        if (dayData.close && dayData.close > 0) {
          const day = Math.floor((dayData.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          prices.push({ day, price: dayData.close });
        }
      }

      // Process dividend data
      const dividends: { day: number; amount: number }[] = [];
      if (result.events && result.events.dividends) {
        console.log(`Found ${result.events.dividends.length} dividend events for ${symbol}`);
        for (let i = 0; i < result.events.dividends.length; i++) {
          const dividend = result.events.dividends[i];
          const dividendDate = new Date(dividend.date * 1000); // Convert timestamp to Date
          const day = Math.floor((dividendDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          dividends.push({ day, amount: dividend.amount });
          console.log(`${symbol} Dividend: Day ${day}, Amount: $${dividend.amount}, Date: ${dividendDate.toISOString().slice(0, 10)}`);
        }
      } else {
        console.log(`No dividend events found for ${symbol}`);
      }

      console.log(`Processed ${prices.length} valid price points for ${symbol}`);
      console.log('Sample prices:', prices.slice(0, 5));
      console.log('Sample dividends:', dividends.slice(0, 5));

      if (prices.length === 0) {
        throw new Error(`No valid price data found for ${symbol}`);
      }

      // Cache the fetched data
      dataCache.set(`${symbol}-${startDate.toISOString()}-${endDate.toISOString()}`, { data: { prices, dividends }, timestamp: Date.now() });
      return { prices, dividends };
    } catch (error) {
      console.error(`Error fetching ${symbol} data:`, error);
      console.log('Error details:', {
        message: error.message,
        stack: error.stack
      });
      console.log(`Falling back to random price generation for ${symbol}...`);
      const fallbackPrices = this.generateDailyPriceSequence({
        initialCapital: 1000000,
        monthlyDistribution: 0.25,
        initialPrice: 10,
        gainThreshold: 0.01,
        cashThreshold: 2000,
        simulationYears: 5,
        symbols: ['EHI', 'OXLC']
      });
      return { prices: fallbackPrices, dividends: [] };
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
    const projectedAnnualDividends = shares * params.monthlyDistribution * 12;
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
    // Calculate date range for historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - params.simulationYears);

    // Fetch data for all symbols
    const symbolData: { [symbol: string]: { prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] } } = {};

    for (const symbol of params.symbols) {
      console.log(`\n=== Fetching data for ${symbol} ===`);
      await delay(5000); // Add a 5-second delay between fetches
      symbolData[symbol] = await this.fetchHistoricalData(symbol, startDate, endDate);
    }

    // Find the minimum number of days across all symbols
    const minDays = Math.min(...Object.values(symbolData).map(data => data.prices.length));
    console.log(`\nUsing ${minDays} days for simulation (minimum across all symbols)`);

    const buyAndHold = this.runMultiSymbolBuyAndHoldStrategy(params, symbolData, minDays);
    const tradingStrategy = this.runMultiSymbolTradingStrategy(params, symbolData, minDays);

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

  private runMultiSymbolBuyAndHoldStrategy(params: SimulationParams, symbolData: { [symbol: string]: { prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] } }, totalDays: number): StrategyResult {
    const dailyData: DailyData[] = [];
    const symbolShares: { [symbol: string]: number } = {};
    const symbolValues: { [symbol: string]: number } = {};
    const symbolDividends: { [symbol: string]: number } = {};

    // Initialize with equal allocation
    const initialAllocation = params.initialCapital / params.symbols.length;
    console.log(`Initial allocation: $${initialAllocation.toFixed(2)} per symbol`);

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
    const symbolSellPrices: { [symbol: string]: number } = {};
    const symbolSoldShares: { [symbol: string]: number } = {}; // Track shares sold for buy-back

    // Initialize with equal allocation
    const initialAllocation = params.initialCapital / params.symbols.length;
    console.log(`Initial allocation: $${initialAllocation.toFixed(2)} per symbol`);

    for (const symbol of params.symbols) {
      const initialPrice = symbolData[symbol].prices[0].price;
      symbolShares[symbol] = Math.floor(initialAllocation / initialPrice);
      symbolValues[symbol] = symbolShares[symbol] * initialPrice;
      symbolDividends[symbol] = 0;
      symbolLastBuyPrices[symbol] = initialPrice;
      symbolPendingBuyBack[symbol] = false;
      symbolSellPrices[symbol] = 0;
      symbolSoldShares[symbol] = 0; // Initialize sold shares to 0
      console.log(`${symbol}: Initial price $${initialPrice.toFixed(2)}, bought ${symbolShares[symbol].toLocaleString()} shares, value $${symbolValues[symbol].toFixed(2)}`);
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

        // Trading logic for each symbol
        if (params.gainThreshold > 0 && symbolShares[symbol] > 0) {
          if (currentPrice >= symbolLastBuyPrices[symbol] * (1 + params.gainThreshold)) {
            const sharesToSell = symbolShares[symbol]; // Capture shares before selling
            const sellValue = sharesToSell * currentPrice;
            trades.push(`${symbol}: SELL ${sharesToSell} shares at $${currentPrice.toFixed(2)}`);
            console.log(`Day ${day}: ${symbol} SELLING ${sharesToSell} shares at $${currentPrice.toFixed(2)} (last buy: $${symbolLastBuyPrices[symbol].toFixed(2)})`);
            cash += sellValue;
            symbolShares[symbol] = 0;
            symbolValues[symbol] = 0;
            totalTrades++;
            symbolPendingBuyBack[symbol] = true;
            symbolSellPrices[symbol] = currentPrice;
            symbolSoldShares[symbol] += sharesToSell; // Track shares sold
          }
        }

        // Buy back logic
        if (symbolPendingBuyBack[symbol] && symbolShares[symbol] === 0) {
          let shouldBuyBack = false;
          let buyBackReason = '';

          // Check if there's a dividend tomorrow (ex-date)
          const tomorrowDividend = symbolData[symbol].dividends.find(d => d.day === day + 1);

          if (currentPrice < symbolSellPrices[symbol]) {
            shouldBuyBack = true;
            buyBackReason = `Price dropped to $${currentPrice.toFixed(2)} (was $${symbolSellPrices[symbol].toFixed(2)})`;
          } else if (tomorrowDividend) {
            shouldBuyBack = true;
            buyBackReason = `Buying back day before ex-date to collect dividend at $${currentPrice.toFixed(2)}`;
          }

          // Debug logging
          if (symbolPendingBuyBack[symbol]) {
            console.log(`Day ${day} (${dateInfo.month}/${dateInfo.dayOfMonth}): ${symbol} pending buy-back, price: $${currentPrice.toFixed(2)}, sell price: $${symbolSellPrices[symbol].toFixed(2)}, dividend tomorrow: ${tomorrowDividend ? 'YES' : 'NO'}`);
          }

          if (shouldBuyBack) {
            // Buy back ALL the shares we sold, or as many as we can afford
            const sharesToBuyBack = symbolSoldShares[symbol];
            const affordableShares = Math.floor(cash / currentPrice);
            const buyShares = Math.min(sharesToBuyBack, affordableShares);

            if (buyShares > 0) {
              const buyValue = buyShares * currentPrice;
              trades.push(`${symbol}: BUY BACK ${buyShares} shares at $${currentPrice.toFixed(2)} - ${buyBackReason}`);
              symbolShares[symbol] = buyShares;
              symbolValues[symbol] = buyShares * currentPrice;
              cash -= buyValue;
              symbolLastBuyPrices[symbol] = currentPrice;
              symbolSoldShares[symbol] -= buyShares; // Reduce sold shares count
              totalTrades++;

              // Only mark as not pending if we bought back ALL shares
              if (symbolSoldShares[symbol] === 0) {
                symbolPendingBuyBack[symbol] = false;
                console.log(`Day ${day}: ${symbol} bought back ALL shares, no longer pending buy-back`);
              } else {
                console.log(`Day ${day}: ${symbol} bought back ${buyShares} shares, still need to buy back ${symbolSoldShares[symbol]} more shares`);
              }

              console.log(`Day ${day}: ${symbol} bought back ${buyShares} shares, remaining sold: ${symbolSoldShares[symbol]}`);
            } else {
              console.log(`Day ${day}: ${symbol} couldn't buy back - no cash or no shares to buy back`);
            }
          }
        }
      }

      // Rebalancing logic: FIRST buy back sold shares, THEN make new investments
      if (cash >= params.cashThreshold) {
        console.log(`Day ${day}: Rebalancing with $${cash.toFixed(2)} cash`);

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
              symbolShares[symbol] = buyShares;
              symbolValues[symbol] = buyShares * currentPrice;
              cash -= buyValue;
              symbolLastBuyPrices[symbol] = currentPrice;
              symbolSoldShares[symbol] -= buyShares;
              totalTrades++;

              if (symbolSoldShares[symbol] === 0) {
                symbolPendingBuyBack[symbol] = false;
                console.log(`Day ${day}: ${symbol} bought back ALL sold shares during rebalancing`);
              } else {
                console.log(`Day ${day}: ${symbol} bought back ${buyShares} shares during rebalancing, still need ${symbolSoldShares[symbol]} more`);
              }
            }
          }
        }

        // Then, make new investments with remaining cash
        if (cash >= params.cashThreshold) {
          const investmentPerSymbol = Math.floor(cash / params.symbols.length);
          console.log(`Day ${day}: Making new investments with $${cash.toFixed(2)} cash, investing $${investmentPerSymbol.toFixed(2)} per symbol`);

          for (const symbol of params.symbols) {
            const currentPrice = symbolData[symbol].prices[day]?.price || symbolData[symbol].prices[symbolData[symbol].prices.length - 1].price;
            const newShares = Math.floor(investmentPerSymbol / currentPrice);
            if (newShares > 0) {
              symbolShares[symbol] += newShares;
              symbolValues[symbol] = symbolShares[symbol] * currentPrice;
              cash -= newShares * currentPrice;
              totalTrades++;
              trades.push(`REINVEST: Buy ${newShares} shares of ${symbol} at $${currentPrice.toFixed(2)}`);
              console.log(`Day ${day}: Bought ${newShares} shares of ${symbol} at $${currentPrice.toFixed(2)}, remaining cash: $${cash.toFixed(2)}`);
            }
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
}

// Main execution
async function main() {
  const simulation = new TradingSimulation();

  const params: SimulationParams = {
    initialCapital: 1000000, // Changed from 10000 to 1000000
    monthlyDistribution: 0.25,
    initialPrice: 10,
    gainThreshold: 0.01, // 1% - back to the original scenario
    cashThreshold: 2000,
    simulationYears: 5, // Currently set to 5 years for faster testing
    symbols: simulation.symbols // Use the class's symbols array
  };

  console.log('=== Multi-Symbol CEF Trading Strategy Simulation ===');
  console.log('');
  console.log('Parameters:');
  console.log(`Initial Capital: $${params.initialCapital.toLocaleString()}`);
  console.log(`Monthly Distribution: $${params.monthlyDistribution}`);
  console.log(`Initial Price: $${params.initialPrice}`);
  console.log(`Gain Threshold: ${(params.gainThreshold * 100).toFixed(0)}%`);
  console.log(`Cash Threshold: $${params.cashThreshold.toLocaleString()}`);
  console.log(`Simulation Years: ${params.simulationYears}`);
  console.log(`Symbols: ${params.symbols.join(', ')}`);
  console.log('');

  // Run the multi-symbol simulation
  console.log('\n=== RUNNING MULTI-SYMBOL SIMULATION ===');
  const result = await simulation.runMultiSymbolSimulation(params);

  console.log('\n=== RESULTS ===');
  console.log('');

  console.log('MULTI-SYMBOL BUY AND HOLD STRATEGY:');
  console.log(`Final Shares: ${result.buyAndHold.finalShares.toLocaleString()}`);
  console.log(`Final Cash: $${result.buyAndHold.finalCash.toFixed(2)}`);
  console.log(`Final Total Value: $${result.buyAndHold.finalTotalValue.toFixed(2)}`);
  console.log(`Total Dividends Collected: $${result.buyAndHold.totalDividendsCollected.toFixed(2)}`);
  console.log(`Projected Annual Dividends: $${result.buyAndHold.projectedAnnualDividends.toFixed(2)}`);
  console.log(`Total Trades: ${result.buyAndHold.totalTrades}`);
  console.log('Per-Symbol Results:');
  for (const [symbol, data] of Object.entries(result.buyAndHold.symbolResults)) {
    console.log(`  ${symbol}: ${data.shares.toLocaleString()} shares, $${data.value.toFixed(2)} value, $${data.dividends.toFixed(2)} dividends`);
  }
  console.log('');

  console.log('MULTI-SYMBOL TRADING STRATEGY:');
  console.log(`Final Shares: ${result.tradingStrategy.finalShares.toLocaleString()}`);
  console.log(`Final Cash: $${result.tradingStrategy.finalCash.toFixed(2)}`);
  console.log(`Final Total Value: $${result.tradingStrategy.finalTotalValue.toFixed(2)}`);
  console.log(`Total Dividends Collected: $${result.tradingStrategy.totalDividendsCollected.toFixed(2)}`);
  console.log(`Projected Annual Dividends: $${result.tradingStrategy.projectedAnnualDividends.toFixed(2)}`);
  console.log(`Total Trades: ${result.tradingStrategy.totalTrades}`);
  console.log('Per-Symbol Results:');
  for (const [symbol, data] of Object.entries(result.tradingStrategy.symbolResults)) {
    console.log(`  ${symbol}: ${data.shares.toLocaleString()} shares, $${data.value.toFixed(2)} value, $${data.dividends.toFixed(2)} dividends`);
  }
  console.log('');

  console.log('COMPARISON:');
  console.log(`Trading vs Buy & Hold: $${result.comparison.tradingVsBuyHold.toFixed(2)}`);
  console.log(`Trading vs Buy & Hold: ${result.comparison.tradingVsBuyHoldPercent.toFixed(2)}%`);
  console.log('');

  if (result.comparison.tradingVsBuyHold > 0) {
    console.log('✅ Trading strategy produces HIGHER annual dividends');
  } else if (result.comparison.tradingVsBuyHold < 0) {
    console.log('❌ Trading strategy produces LOWER annual dividends');
  } else {
    console.log('➖ Trading strategy produces SAME annual dividends');
  }

  console.log('');
  console.log('=== CONCLUSION ===');
  console.log('The simulation shows whether selling at gains and buying back');
  console.log('produces better dividend income than simply buying and holding');
  console.log('in a multi-symbol portfolio with rebalancing.');
  console.log('Run multiple times to see the variance in results due to');
  console.log('random price movements.');
}

// Run the simulation
main().catch(console.error);

