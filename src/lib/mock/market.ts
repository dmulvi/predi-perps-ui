import type { CandlestickData, UTCTimestamp } from "lightweight-charts";

export type MarketSummary = {
  symbol: string;
  markPrice: number;
  changePct24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
};

export type Position = {
  id: string;
  market: string;
  side: "Long" | "Short";
  margin: number;
  notionalValue: number;
  unrealizedPnl: number;
  pnlPct: number;
  currentPrice: number;
  entryPrice: number;
  amount: number;
  liqPrice: number;
  estFeeRebate: string;
  leverage?: number;
  txHash?: string;
  openedAt?: number;
};

export type MarketCategory =
  | "Crypto"
  | "Foreign Exchange (FX)"
  | "Stocks"
  | "Commodities"
  | "What if?";

export type MarketListItem = {
  symbol: string;
  lastPrice: number;
  changePct24h: number;
  volume: number;
  rebateLong: number;
  rebateShort: number;
  category: MarketCategory;
};

const BASE_PRICE = 74390;
const START_TIME = 1_710_000_000;

function round(n: number, digits = 2) {
  return Number(n.toFixed(digits));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createSeededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

export function seedCandles(
  count = 180,
  seed = 1337
): CandlestickData<UTCTimestamp>[] {
  const candles: CandlestickData<UTCTimestamp>[] = [];
  let prevClose = BASE_PRICE;
  const seededRandom = createSeededRandom(seed);
  const seededBetween = (min: number, max: number) =>
    min + seededRandom() * (max - min);

  for (let i = 0; i < count; i += 1) {
    const open = prevClose;
    const close = open + seededBetween(-220, 220);
    const high = Math.max(open, close) + seededBetween(30, 180);
    const low = Math.min(open, close) - seededBetween(30, 180);

    candles.push({
      time: (START_TIME + i * 60) as UTCTimestamp,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
    });

    prevClose = close;
  }

  return candles;
}

export function nextCandle(
  prev: CandlestickData<UTCTimestamp>
): CandlestickData<UTCTimestamp> {
  const open = prev.close;
  const close = open + randomBetween(-160, 160);
  const high = Math.max(open, close) + randomBetween(25, 120);
  const low = Math.min(open, close) - randomBetween(25, 120);

  return {
    time: ((prev.time as number) + 60) as UTCTimestamp,
    open: round(open),
    high: round(high),
    low: round(low),
    close: round(close),
  };
}

export const baseSummary: MarketSummary = {
  symbol: "BTC-USD",
  markPrice: BASE_PRICE,
  changePct24h: -1.84,
  high24h: 75424.2,
  low24h: 72994.5,
  volume24h: 798.18,
  openInterest: 590.04,
  fundingRate: -0.0042,
};

export const marketCategories: MarketCategory[] = [
  "Crypto",
  "Foreign Exchange (FX)",
  "Stocks",
  "Commodities",
  "What if?",
];

export const marketList: MarketListItem[] = [
  {
    symbol: "XRP-USD",
    lastPrice: 1.3839,
    changePct24h: 2.1328,
    volume: 0,
    rebateLong: 0,
    rebateShort: 0,
    category: "Crypto",
  },
  {
    symbol: "BTC-USD",
    lastPrice: 74400,
    changePct24h: 0.17,
    volume: 39100,
    rebateLong: 0,
    rebateShort: 0,
    category: "Crypto",
  },
  {
    symbol: "SOL-USD",
    lastPrice: 84.9,
    changePct24h: 0.9153,
    volume: 0,
    rebateLong: 0,
    rebateShort: 0,
    category: "Crypto",
  },
  {
    symbol: "EUR-USD",
    lastPrice: 1.0952,
    changePct24h: 0.148,
    volume: 8430,
    rebateLong: 0,
    rebateShort: 0,
    category: "Foreign Exchange (FX)",
  },
  {
    symbol: "AAPL-USD",
    lastPrice: 189.48,
    changePct24h: 0.42,
    volume: 29210,
    rebateLong: 0,
    rebateShort: 0,
    category: "Stocks",
  },
  {
    symbol: "WTI-USD",
    lastPrice: 91.11,
    changePct24h: -0.9,
    volume: 0,
    rebateLong: 0,
    rebateShort: 0,
    category: "Commodities",
  },
  {
    symbol: "XAU-USD",
    lastPrice: 2335.1,
    changePct24h: -0.12,
    volume: 1950,
    rebateLong: 0,
    rebateShort: 0,
    category: "Commodities",
  },
  {
    symbol: "WTI-USD-WHAT-IF",
    lastPrice: 19.44,
    changePct24h: 1.23,
    volume: 210,
    rebateLong: 0,
    rebateShort: 0,
    category: "What if?",
  },
  {
    symbol: "BTC-USD-WHAT-IF",
    lastPrice: 74450,
    changePct24h: 0.12,
    volume: 0,
    rebateLong: 0,
    rebateShort: 0,
    category: "What if?",
  },
];

