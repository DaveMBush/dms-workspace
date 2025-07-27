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
  runSimulation(params: SimulationParams): SimulationResult {
    // Generate daily price sequence once so both strategies use identical market data
    const priceSequence = this.generateDailyPriceSequence(params);

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
    const totalDays = params.simulationYears * 365;

    let shares = Math.floor(params.initialCapital / params.initialPrice);
    let cash = params.initialCapital - (shares * params.initialPrice);
    let cumulativeDividends = 0;
    let totalTrades = 0;
    let lastDividendDay = -1;

    for (let day = 1; day <= totalDays; day++) {
      const dateInfo = this.getDateInfo(day);
      const currentPrice = priceSequence[day].price;
      const trades: string[] = [];

      // Collect dividends on the 15th of each month
      let dividends = 0;
      if (dateInfo.dayOfMonth === 15 && day !== lastDividendDay) {
        dividends = shares * params.monthlyDistribution;
        cumulativeDividends += dividends;
        cash += dividends;
        lastDividendDay = day;
      }

      // Reinvest if we have enough cash
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

      dailyData.push({
        day,
        year: dateInfo.year,
        month: dateInfo.month,
        dayOfMonth: dateInfo.dayOfMonth,
        price: currentPrice,
        shares,
        cash,
        totalValue,
        dividends,
        cumulativeDividends,
        trades
      });
    }

    const projectedAnnualDividends = shares * params.monthlyDistribution * 12;

    return {
      strategyName: 'Buy and Hold',
      dailyData,
      finalShares: shares,
      finalCash: cash,
      finalTotalValue: shares * priceSequence[totalDays].price + cash,
      totalDividendsCollected: cumulativeDividends,
      projectedAnnualDividends,
      totalTrades
    };
  }

  private runTradingStrategy(params: SimulationParams, priceSequence: { day: number; price: number }[]): StrategyResult {
    const dailyData: DailyData[] = [];
    const totalDays = params.simulationYears * 365;
    let shares = Math.floor(params.initialCapital / params.initialPrice);
    let cash = params.initialCapital - (shares * params.initialPrice);
    let lastBuyPrice = params.initialPrice;
    let cumulativeDividends = 0;
    let totalTrades = 0;
    let pendingBuyBack = false;
    let sellPrice = 0;
    let lastDividendDay = -1;

    for (let day = 1; day <= totalDays; day++) {
      const dateInfo = this.getDateInfo(day);
      const trades: string[] = [];
      const currentPrice = priceSequence[day].price;

      // Collect dividends on the 15th of each month
      let dividends = 0;
      if (dateInfo.dayOfMonth === 15 && day !== lastDividendDay) {
        dividends = shares * params.monthlyDistribution;
        cumulativeDividends += dividends;
        cash += dividends;
        lastDividendDay = day;
      }

      // Check if we should sell (1% gain from last buy price)
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

      // Buy back logic: wait for better price or buy by the 14th
      if (pendingBuyBack && shares === 0) {
        let shouldBuyBack = false;
        let buyBackReason = '';

        // Buy back if price goes down below sell price
        if (currentPrice < sellPrice) {
          shouldBuyBack = true;
          buyBackReason = `Price dropped to $${currentPrice.toFixed(2)} (was $${sellPrice.toFixed(2)})`;
        }
        // Buy back on the 14th to ensure we collect the dividend on the 15th
        else if (dateInfo.dayOfMonth === 14) {
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

      // Reinvest if we have enough cash (same logic as buy and hold)
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

      dailyData.push({
        day,
        year: dateInfo.year,
        month: dateInfo.month,
        dayOfMonth: dateInfo.dayOfMonth,
        price: currentPrice,
        shares,
        cash,
        totalValue,
        dividends,
        cumulativeDividends,
        trades
      });
    }

    const projectedAnnualDividends = shares * params.monthlyDistribution * 12;

    return {
      strategyName: 'Trading Strategy',
      dailyData,
      finalShares: shares,
      finalCash: cash,
      finalTotalValue: shares * priceSequence[totalDays].price + cash,
      totalDividendsCollected: cumulativeDividends,
      projectedAnnualDividends,
      totalTrades
    };
  }
}

// Run the simulation
const simulation = new TradingSimulation();

const params: SimulationParams = {
  initialCapital: 1000000, // Changed from 10000 to 1000000
  monthlyDistribution: 0.25,
  initialPrice: 10,
  gainThreshold: 0.01, // 1% - back to the original scenario
  cashThreshold: 2000,
  simulationYears: 5
};

console.log('=== CEF Trading Strategy Simulation ===\n');
console.log('Parameters:');
console.log(`Initial Capital: $${params.initialCapital.toLocaleString()}`);
console.log(`Monthly Distribution: $${params.monthlyDistribution}`);
console.log(`Initial Price: $${params.initialPrice}`);
console.log(`Gain Threshold: ${(params.gainThreshold * 100)}%`);
console.log(`Cash Threshold: $${params.cashThreshold}`);
console.log(`Simulation Years: ${params.simulationYears}\n`);

// Test: If we set gain threshold to 0, trading should be identical to buy and hold
console.log('=== TESTING: Zero Gain Threshold ===');
const testParams = { ...params, gainThreshold: 0 };
const testResult = simulation.runSimulation(testParams);
console.log(`Buy & Hold Final Shares: ${testResult.buyAndHold.finalShares}`);
console.log(`Trading Final Shares: ${testResult.tradingStrategy.finalShares}`);
console.log(`Shares Difference: ${testResult.tradingStrategy.finalShares - testResult.buyAndHold.finalShares}`);
console.log(`Annual Dividend Difference: $${testResult.comparison.tradingVsBuyHold.toFixed(2)}`);

// If gain threshold is 0, results should be identical
if (Math.abs(testResult.comparison.tradingVsBuyHold) > 0.01) {
  console.log('❌ ERROR: With zero gain threshold, results should be identical!');
  console.log('This indicates a bug in the trading strategy logic.');
  console.log('The difference is likely due to dividend collection timing.');
} else {
  console.log('✅ SUCCESS: With zero gain threshold, results are identical.');
}

// Show some sample trades from the trading strategy
console.log('\n=== SAMPLE TRADES FROM TRADING STRATEGY ===');
const tradingTrades = testResult.tradingStrategy.dailyData
  .filter(day => day.trades.length > 0)
  .slice(0, 5); // Show first 5 days with trades

tradingTrades.forEach(day => {
  console.log(`Day ${day.day} (${day.month}/${day.dayOfMonth}/${day.year}): ${day.trades.join(', ')}`);
});

console.log('');

const result = simulation.runSimulation(params);

console.log('=== RESULTS ===\n');

// Buy and Hold Results
console.log('BUY AND HOLD STRATEGY:');
console.log(`Final Shares: ${result.buyAndHold.finalShares.toLocaleString()}`);
console.log(`Final Cash: $${result.buyAndHold.finalCash.toFixed(2)}`);
console.log(`Final Total Value: $${result.buyAndHold.finalTotalValue.toFixed(2)}`);
console.log(`Total Dividends Collected: $${result.buyAndHold.totalDividendsCollected.toFixed(2)}`);
console.log(`Projected Annual Dividends: $${result.buyAndHold.projectedAnnualDividends.toFixed(2)}`);
console.log(`Total Trades: ${result.buyAndHold.totalTrades}\n`);

// Trading Strategy Results
console.log('TRADING STRATEGY:');
console.log(`Final Shares: ${result.tradingStrategy.finalShares.toLocaleString()}`);
console.log(`Final Cash: $${result.tradingStrategy.finalCash.toFixed(2)}`);
console.log(`Final Total Value: $${result.tradingStrategy.finalTotalValue.toFixed(2)}`);
console.log(`Total Dividends Collected: $${result.tradingStrategy.totalDividendsCollected.toFixed(2)}`);
console.log(`Projected Annual Dividends: $${result.tradingStrategy.projectedAnnualDividends.toFixed(2)}`);
console.log(`Total Trades: ${result.tradingStrategy.totalTrades}\n`);

// Comparison
console.log('COMPARISON:');
console.log(`Trading vs Buy & Hold: $${result.comparison.tradingVsBuyHold.toFixed(2)}`);
console.log(`Trading vs Buy & Hold: ${result.comparison.tradingVsBuyHoldPercent.toFixed(2)}%`);

if (result.comparison.tradingVsBuyHold > 0) {
  console.log('\n✅ Trading strategy produces HIGHER annual dividends');
} else {
  console.log('\n❌ Trading strategy produces LOWER annual dividends');
}

console.log('\n=== CONCLUSION ===');
console.log('The simulation shows whether selling at gains and buying back');
console.log('produces better dividend income than simply buying and holding.');
console.log('Run multiple times to see the variance in results due to');
console.log('random price movements.');
