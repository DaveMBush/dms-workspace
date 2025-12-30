// eslint-disable-next-line @typescript-eslint/naming-convention -- YahooFinance is the class name from the library
import YahooFinance from 'yahoo-finance2';

export const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
});
