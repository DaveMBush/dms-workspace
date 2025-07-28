import axios from 'axios';
import yahooFinance from 'yahoo-finance2';

interface SimulationParams {
  initialCapital: number;
  monthlyDistribution: number;
  initialPrice: number;
  gainThreshold: number;
  cashThreshold: number;
  simulationYears: number;
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
  private async fetchEHIHistoricalData(startDate: Date, endDate: Date): Promise<{ prices: { day: number; price: number }[]; dividends: { day: number; amount: number }[] }> {
    try {
      console.log('Fetching EHI historical data...');
      console.log(`Date range: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout fetching EHI data')), 15000);
      });

      const dataPromise = yahooFinance.chart('EHI', {
        period1: startDate.toISOString().slice(0, 10),
        period2: endDate.toISOString().slice(0, 10),
        interval: '1d',
        events: 'dividends' // Include dividend events
      });

      console.log('Making API call to yahoo-finance2...');
      const result = await Promise.race([dataPromise, timeoutPromise]) as any;
      console.log('API call completed successfully');

      if (!result.quotes || result.quotes.length === 0) {
        throw new Error('No data received from Yahoo Finance');
      }

      console.log(`Fetched ${result.quotes.length} days of EHI data`);
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
        console.log(`Found ${result.events.dividends.length} dividend events`);
        for (let i = 0; i < result.events.dividends.length; i++) {
          const dividend = result.events.dividends[i];
          const dividendDate = new Date(dividend.date * 1000); // Convert timestamp to Date
          const day = Math.floor((dividendDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          dividends.push({ day, amount: dividend.amount });
          console.log(`Dividend: Day ${day}, Amount: $${dividend.amount}, Date: ${dividendDate.toISOString().slice(0, 10)}`);
        }
      } else {
        console.log('No dividend events found in the data');
      }

      console.log(`Processed ${prices.length} valid price points`);
      console.log('Sample prices:', prices.slice(0, 5));
      console.log('Sample dividends:', dividends.slice(0, 5));

      if (prices.length === 0) {
        throw new Error('No valid price data found');
      }

      return { prices, dividends };
    } catch (error) {
      console.error('Error fetching EHI data:', error);
      console.log('Error details:', {
        message: error.message,
        stack: error.stack
      });
      console.log('Falling back to random price generation...');
      const fallbackPrices = this.generateDailyPriceSequence({
        initialCapital: 1000000,
        monthlyDistribution: 0.25,
        initialPrice: 10,
        gainThreshold: 0.01,
        cashThreshold: 2000,
        simulationYears: 5
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
      dailyData.push({ day, year: dateInfo.year, month: dateInfo.month, dayOfMonth: dateInfo.dayOfMonth, price: currentPrice, shares, cash, totalValue, dividends, cumulativeDividends, trades });
    }
    const projectedAnnualDividends = shares * params.monthlyDistribution * 12;
    return { strategyName: 'Buy and Hold', dailyData, finalShares: shares, finalCash: cash, finalTotalValue: shares * priceSequence[totalDays].price + cash, totalDividendsCollected: cumulativeDividends, projectedAnnualDividends, totalTrades };
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
      dailyData.push({ day, year: dateInfo.year, month: dateInfo.month, dayOfMonth: dateInfo.dayOfMonth, price: currentPrice, shares, cash, totalValue, dividends, cumulativeDividends, trades });
    }
    const projectedAnnualDividends = shares * params.monthlyDistribution * 12;
    return { strategyName: 'Trading Strategy', dailyData, finalShares: shares, finalCash: cash, finalTotalValue: shares * priceSequence[totalDays].price + cash, totalDividendsCollected: cumulativeDividends, projectedAnnualDividends, totalTrades };
  }

  async runSimulation(params: SimulationParams): Promise<SimulationResult> {
    // Calculate date range for historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - params.simulationYears);

    // For now, use random data generation instead of real EHI data
    // TODO: Yahoo Finance is rate limiting (HTTP 429) - need to implement proper rate limiting or use alternative data source
    // const priceSequence = this.generateDailyPriceSequence(params);
    const { prices, dividends } = await this.fetchEHIHistoricalData(startDate, endDate);

    const buyAndHold = this.runBuyAndHoldStrategy(params, prices);
    const tradingStrategy = this.runTradingStrategy(params, prices);

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
    simulationYears: 5 // Currently set to 5 years for faster testing
  };

  console.log('=== CEF Trading Strategy Simulation ===');
  console.log('');
  console.log('Parameters:');
  console.log(`Initial Capital: $${params.initialCapital.toLocaleString()}`);
  console.log(`Monthly Distribution: $${params.monthlyDistribution}`);
  console.log(`Initial Price: $${params.initialPrice}`);
  console.log(`Gain Threshold: ${(params.gainThreshold * 100).toFixed(0)}%`);
  console.log(`Cash Threshold: $${params.cashThreshold.toLocaleString()}`);
  console.log(`Simulation Years: ${params.simulationYears}`);
  console.log('');

  // Test: If we set gain threshold to 0, trading should be identical to buy and hold
  console.log('=== TESTING: Zero Gain Threshold ===');
  const testParams = { ...params, gainThreshold: 0 };
  const testResult = await simulation.runSimulation(testParams);
  console.log(`Buy & Hold Final Shares: ${testResult.buyAndHold.finalShares}`);
  console.log(`Trading Final Shares: ${testResult.tradingStrategy.finalShares}`);
  console.log(`Shares Difference: ${testResult.tradingStrategy.finalShares - testResult.buyAndHold.finalShares}`);
  console.log(`Annual Dividend Difference: $${testResult.comparison.tradingVsBuyHold.toFixed(2)}`);
  if (Math.abs(testResult.comparison.tradingVsBuyHold) > 0.01) {
    console.log('❌ ERROR: With zero gain threshold, results should be identical!');
    console.log('This indicates a bug in the trading strategy logic.');
    console.log('The difference is likely due to dividend collection timing.');
  } else {
    console.log('✅ SUCCESS: With zero gain threshold, results are identical.');
  }
  console.log('');

  // Show some sample trades from the trading strategy
  console.log('\n=== SAMPLE TRADES FROM TRADING STRATEGY ===');
  const tradingTrades = testResult.tradingStrategy.dailyData
    .filter(day => day.trades.length > 0)
    .slice(0, 5); // Show first 5 days with trades
  tradingTrades.forEach(day => {
    console.log(`Day ${day.day} (${day.month}/${day.dayOfMonth}/${day.year}): ${day.trades.join(', ')}`);
  });

  // Run the actual simulation with the original parameters
  console.log('\n=== RUNNING ACTUAL SIMULATION ===');
  const result = await simulation.runSimulation(params);

  console.log('\n=== RESULTS ===');
  console.log('');

  console.log('BUY AND HOLD STRATEGY:');
  console.log(`Final Shares: ${result.buyAndHold.finalShares.toLocaleString()}`);
  console.log(`Final Cash: $${result.buyAndHold.finalCash.toFixed(2)}`);
  console.log(`Final Total Value: $${result.buyAndHold.finalTotalValue.toFixed(2)}`);
  console.log(`Total Dividends Collected: $${result.buyAndHold.totalDividendsCollected.toFixed(2)}`);
  console.log(`Projected Annual Dividends: $${result.buyAndHold.projectedAnnualDividends.toFixed(2)}`);
  console.log(`Total Trades: ${result.buyAndHold.totalTrades}`);
  console.log('');

  console.log('TRADING STRATEGY:');
  console.log(`Final Shares: ${result.tradingStrategy.finalShares.toLocaleString()}`);
  console.log(`Final Cash: $${result.tradingStrategy.finalCash.toFixed(2)}`);
  console.log(`Final Total Value: $${result.tradingStrategy.finalTotalValue.toFixed(2)}`);
  console.log(`Total Dividends Collected: $${result.tradingStrategy.totalDividendsCollected.toFixed(2)}`);
  console.log(`Projected Annual Dividends: $${result.tradingStrategy.projectedAnnualDividends.toFixed(2)}`);
  console.log(`Total Trades: ${result.tradingStrategy.totalTrades}`);
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
  console.log('produces better dividend income than simply buying and holding.');
  console.log('Run multiple times to see the variance in results due to');
  console.log('random price movements.');
}

// Run the simulation
main().catch(console.error);

