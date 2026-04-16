import type { CandlestickData, UTCTimestamp } from "lightweight-charts";

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

/**
 * Synthetic hybrid (perp × prediction) candle history anchored near `anchorClose`.
 * Used when the API omits `candles` / `hybrid_candles`.
 */
export function seedHybridCandles(
  count = 120,
  anchorClose: number,
  seed = 4242
): CandlestickData<UTCTimestamp>[] {
  const candles: CandlestickData<UTCTimestamp>[] = [];
  const vol = Math.max(anchorClose * 0.002, 12);
  let prevClose = anchorClose - randomBetween(-vol * 3, vol * 3);
  const seededRandom = createSeededRandom(seed);
  const between = (min: number, max: number) => min + seededRandom() * (max - min);

  for (let i = 0; i < count; i += 1) {
    const open = prevClose;
    const close = open + between(-vol, vol);
    const high = Math.max(open, close) + between(vol * 0.1, vol * 0.45);
    const low = Math.min(open, close) - between(vol * 0.1, vol * 0.45);

    candles.push({
      time: (START_TIME + i * 60) as UTCTimestamp,
      open: round(open, 4),
      high: round(high, 4),
      low: round(low, 4),
      close: round(close, 4),
    });

    prevClose = close;
  }

  const last = candles[candles.length - 1];
  if (last) {
    last.close = round(anchorClose, 4);
    last.high = Math.max(last.high, last.close);
    last.low = Math.min(last.low, last.close);
  }

  return candles;
}

export function nextHybridCandle(
  prev: CandlestickData<UTCTimestamp>,
  anchorHint?: number
): CandlestickData<UTCTimestamp> {
  const open = prev.close;
  /**
   * Keep synthetic moves proportional to price so low-priced markets (e.g. WTI what-if)
   * do not jump excessively. This targets sub-2% per-tick movement.
   */
  const vol = Math.max(Math.abs(open) * 0.002, 0.02);
  let close = open + randomBetween(-vol * 0.85, vol * 0.85);
  if (anchorHint != null) {
    close = close * 0.88 + anchorHint * 0.12;
  }
  const high = Math.max(open, close) + randomBetween(vol * 0.08, vol * 0.35);
  const low = Math.min(open, close) - randomBetween(vol * 0.08, vol * 0.35);

  return {
    time: ((prev.time as number) + 60) as UTCTimestamp,
    open: round(open, 4),
    high: round(high, 4),
    low: round(low, 4),
    close: round(close, 4),
  };
}
