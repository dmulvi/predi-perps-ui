"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { candleRowsSignature, candlesFromApi } from "@/lib/api/whatIfMarket";
import type { WhatIfMarketApiResponse } from "@/lib/api/whatIfMarket";
import { isWhatIfSymbol } from "@/lib/constants/markets";
import { nextHybridCandle, seedHybridCandles } from "@/lib/mock/hybridSeries";

const TICK_MS = 2200;
const MAX_PRICE_DEVIATION_PCT = 0.2;
const CANDLE_INTERVAL_MS = 60_000;

function isWithinDeviationGuard(prevClose: number, nextPrice: number) {
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) return false;
  if (!Number.isFinite(prevClose) || prevClose <= 0) return true;
  const deviation = Math.abs(nextPrice - prevClose) / prevClose;
  return deviation <= MAX_PRICE_DEVIATION_PCT;
}

type Params = {
  selectedSymbol: string;
  apiData: WhatIfMarketApiResponse | null;
  /** List / UI reference price while API snapshot is still loading */
  fallbackAnchorPrice: number;
};

/**
 * Main trading-view series for BTC-USD-WHAT-IF: hybrid OHLC from API `history` → `candles`, mark from `price`.
 * Remote API: with server `candles`, only syncs when history changes (signature) and patches last bar to `price`.
 * Mock fallback: appends `nextHybridCandle` on a timer so the chart keeps moving.
 * API success: no simulation — polling drives updates.
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
  /** Track previous API snapshot object so we can detect poll ticks. */
  const prevApiPayloadRef = useRef<WhatIfMarketApiResponse | null>(null);
  /** Wall-clock timestamp of last appended candle for API tick mode. */
  const lastApiAppendAtMsRef = useRef<number>(0);
  const active = isWhatIfSymbol(selectedSymbol);

  const hybridPrice = apiData?.price;
  const serverCandles = apiData?.candles;
  const serverCandlesKey = useMemo(
    () => candleRowsSignature(serverCandles),
    [serverCandles]
  );
  const hasServerHistory = Boolean(serverCandles?.length);
  const isMockFallback = apiData?.dataSource === "mock";
  /** Simulate only for fallback/mock responses. API success should never synthesize bars. */
  const allowSyntheticTickStream = isMockFallback;

  useEffect(() => {
    if (!active) {
      skeletonRef.current = false;
      seededWithoutServerRef.current = false;
      lastSyncedHistoryKeyRef.current = "";
      prevApiPayloadRef.current = null;
      lastApiAppendAtMsRef.current = 0;
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
    lastApiAppendAtMsRef.current = Date.now();
    queueMicrotask(() => setCandles(candlesFromApi(serverCandles!)));
  }, [active, apiData, fallbackAnchorPrice, hasServerHistory, serverCandles, serverCandlesKey]);

  useEffect(() => {
    if (!active || hybridPrice == null) return;

    queueMicrotask(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const prevClose = prev[prev.length - 1]?.close;
        if (!isWithinDeviationGuard(prevClose, hybridPrice)) return prev;
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

  /**
   * API mode, unchanged history key: each successful poll should still produce a fresh bar.
   * This avoids the "same candle keeps updating" behavior when backend serves last-N history
   * with a moving mark price but without appending timestamps every second.
   */
  useEffect(() => {
    if (!active || !apiData || apiData.dataSource !== "api" || !hasServerHistory) return;

    const previousPayload = prevApiPayloadRef.current;
    prevApiPayloadRef.current = apiData;

    // Skip first API payload; base series is seeded by the history-sync effect above.
    if (!previousPayload) return;

    // If server sent a genuinely new history slice, let the sync effect handle it.
    if (serverCandlesKey !== lastSyncedHistoryKeyRef.current) return;

    setCandles((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      const close = hybridPrice ?? last.close;
      if (!isWithinDeviationGuard(last.close, close)) return prev;
      const now = Date.now();
      const shouldAppend =
        lastApiAppendAtMsRef.current === 0 ||
        now - lastApiAppendAtMsRef.current >= CANDLE_INTERVAL_MS;

      if (!shouldAppend) {
        const next = [...prev];
        const i = next.length - 1;
        const current = { ...next[i] };
        current.close = close;
        current.high = Math.max(current.high, close);
        current.low = Math.min(current.low, close);
        next[i] = current;
        return next;
      }

      lastApiAppendAtMsRef.current = now;
      const open = last.close;
      const nextBar: CandlestickData<UTCTimestamp> = {
        time: ((last.time as number) + 60) as UTCTimestamp,
        open,
        high: Math.max(open, close),
        low: Math.min(open, close),
        close,
      };
      return [...prev, nextBar].slice(-220);
    });
  }, [active, apiData, hasServerHistory, hybridPrice, serverCandlesKey]);

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
