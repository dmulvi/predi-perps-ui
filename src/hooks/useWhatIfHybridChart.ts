"use client";

import { useEffect, useRef, useState } from "react";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { candlesFromApi } from "@/lib/api/whatIfMarket";
import type { WhatIfMarketApiResponse } from "@/lib/api/whatIfMarket";
import { isWhatIfSymbol } from "@/lib/constants/markets";
import { nextHybridCandle, seedHybridCandles } from "@/lib/mock/hybridSeries";

const TICK_MS = 2200;

type Params = {
  selectedSymbol: string;
  apiData: WhatIfMarketApiResponse | null;
  /** List / UI reference price while API snapshot is still loading */
  fallbackAnchorPrice: number;
};

/**
 * Main trading-view series for BTC-USD-WHAT-IF: hybrid (perp × prediction) OHLC.
 * See the hybrid chart section on `WhatIfMarketApiResponse` in `src/lib/api/whatIfMarket.ts`.
 */
export function useWhatIfHybridChart({
  selectedSymbol,
  apiData,
  fallbackAnchorPrice,
}: Params) {
  const [candles, setCandles] = useState<CandlestickData<UTCTimestamp>[]>([]);
  const skeletonRef = useRef(false);
  const mergedFromApiRef = useRef(false);
  const active = isWhatIfSymbol(selectedSymbol);

  const hybridPrice = apiData?.price;

  useEffect(() => {
    if (!active) {
      skeletonRef.current = false;
      mergedFromApiRef.current = false;
      queueMicrotask(() => setCandles([]));
      return;
    }

    if (!apiData) {
      if (!skeletonRef.current) {
        skeletonRef.current = true;
        queueMicrotask(() => setCandles(seedHybridCandles(100, fallbackAnchorPrice)));
      }
      return;
    }

    if (mergedFromApiRef.current) return;
    mergedFromApiRef.current = true;

    if (apiData.candles?.length) {
      const fromApi = candlesFromApi(apiData.candles);
      queueMicrotask(() => setCandles(fromApi));
      return;
    }

    queueMicrotask(() =>
      setCandles(seedHybridCandles(140, hybridPrice ?? fallbackAnchorPrice))
    );
  }, [active, apiData, fallbackAnchorPrice, hybridPrice]);

  useEffect(() => {
    if (!active || hybridPrice == null) return;

    queueMicrotask(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const i = next.length - 1;
        const last = { ...next[i] };
        last.close = hybridPrice;
        last.high = Math.max(last.high, hybridPrice);
        last.low = Math.min(last.low, hybridPrice);
        next[i] = last;
        return next;
      });
    });
  }, [active, hybridPrice]);

  useEffect(() => {
    if (!active) return;

    const id = window.setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const nextBar = nextHybridCandle(last, hybridPrice ?? undefined);
        return [...prev, nextBar].slice(-220);
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [active, hybridPrice]);

  return candles;
}
