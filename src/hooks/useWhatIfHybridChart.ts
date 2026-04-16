"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { candleRowsSignature, candlesFromApi } from "@/lib/api/whatIfMarket";
import type { WhatIfMarketApiResponse } from "@/lib/api/whatIfMarket";
import { isWhatIfSymbol } from "@/lib/constants/markets";
import { isWhatIfFixtureMode } from "@/lib/whatIf/fixtureMode";
import { nextHybridCandle, seedHybridCandles } from "@/lib/mock/hybridSeries";

const TICK_MS = 2200;

type Params = {
  selectedSymbol: string;
  apiData: WhatIfMarketApiResponse | null;
  /** List / UI reference price while API snapshot is still loading */
  fallbackAnchorPrice: number;
};

/**
 * Main trading-view series for BTC-USD-WHAT-IF: hybrid OHLC from API `history` → `candles`, mark from `price`.
 * Remote API: with server `candles`, only syncs when history changes (signature) and patches last bar to `price`.
 * Local fixture: same load, then still appends `nextHybridCandle` on a timer so the chart keeps moving.
 * Without API candles, falls back to seeded mock + tick stream.
 */
export function useWhatIfHybridChart({
  selectedSymbol,
  apiData,
  fallbackAnchorPrice,
}: Params) {
  const [candles, setCandles] = useState<CandlestickData<UTCTimestamp>[]>([]);
  const skeletonRef = useRef(false);
  /** Avoid re-seeding synthetic history on every poll when the API has no `candles` yet. */
  const seededWithoutServerRef = useRef(false);
  /** Skip reloading from `serverCandles` when the snapshot fingerprint is unchanged (polls return new object refs). */
  const lastSyncedHistoryKeyRef = useRef<string>("");
  const active = isWhatIfSymbol(selectedSymbol);

  const hybridPrice = apiData?.price;
  const serverCandles = apiData?.candles;
  const serverCandlesKey = useMemo(
    () => candleRowsSignature(serverCandles),
    [serverCandles]
  );
  const hasServerHistory = Boolean(serverCandles?.length);
  const fixtureMode = isWhatIfFixtureMode();
  /** Append synthetic bars on a timer when we are not on a remote API with frozen history. */
  const allowSyntheticTickStream = !hasServerHistory || fixtureMode;

  useEffect(() => {
    if (!active) {
      skeletonRef.current = false;
      seededWithoutServerRef.current = false;
      lastSyncedHistoryKeyRef.current = "";
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

    if (!hasServerHistory) {
      if (!seededWithoutServerRef.current) {
        seededWithoutServerRef.current = true;
        queueMicrotask(() =>
          setCandles(seedHybridCandles(140, hybridPrice ?? fallbackAnchorPrice))
        );
      }
      return;
    }

    if (serverCandlesKey === lastSyncedHistoryKeyRef.current) {
      return;
    }
    lastSyncedHistoryKeyRef.current = serverCandlesKey;

    seededWithoutServerRef.current = false;
    queueMicrotask(() => setCandles(candlesFromApi(serverCandles!)));
  }, [active, apiData, fallbackAnchorPrice, hasServerHistory, serverCandles, serverCandlesKey]);

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
    if (!active || !allowSyntheticTickStream) return;

    const id = window.setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const nextBar = nextHybridCandle(last, hybridPrice ?? undefined);
        return [...prev, nextBar].slice(-220);
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [active, allowSyntheticTickStream, hybridPrice]);

  return candles;
}
