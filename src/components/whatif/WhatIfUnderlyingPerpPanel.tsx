"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import type { WhatIfMarketApiResponse } from "@/lib/api/whatIfMarket";
import { candleRowsSignature, candlesFromApi } from "@/lib/api/whatIfMarket";
import { MiniPerpChart } from "@/components/chart/MiniPerpChart";
import { nextHybridCandle } from "@/lib/mock/hybridSeries";

const TICK_MS = 2200;

function patchLastClose(
  series: CandlestickData<UTCTimestamp>[],
  mark: number
): CandlestickData<UTCTimestamp>[] {
  if (!series.length) return series;
  const next = [...series];
  const i = next.length - 1;
  const bar = { ...next[i] };
  bar.close = mark;
  bar.high = Math.max(bar.high, mark);
  bar.low = Math.min(bar.low, mark);
  next[i] = bar;
  return next;
}

type Props = {
  snapshot: WhatIfMarketApiResponse | null;
  /** Fallback OHLC when API does not send `underlyingPerp.candles` (e.g. page-level mock stream). */
  mockSeries?: CandlestickData<UTCTimestamp>[];
};

export function WhatIfUnderlyingPerpPanel({ snapshot, mockSeries = [] }: Props) {
  const perp = snapshot?.underlyingPerp;
  const label = perp?.symbol ?? "BTC-USD";
  const price = perp?.price;
  const changePct = perp?.change24hPct;

  const rows = perp?.candles;
  const rowKey = useMemo(() => candleRowsSignature(rows), [rows]);

  const [chartCandles, setChartCandles] = useState<CandlestickData<UTCTimestamp>[] | null>(null);
  const lastSyncedHistoryKeyRef = useRef<string>("");

  const hasServerRows = Boolean(rows?.length);
  const isMockFallback = snapshot?.dataSource === "mock";
  /** API success: never synthesize perp bars; fallback/mock: allow synthetic updates. */
  const allowSyntheticTickStream = isMockFallback;

  /** Replace series when `base.history` / mock fingerprint changes — not on every poll ref or price tick. */
  useEffect(() => {
    if (hasServerRows && rows) {
      if (rowKey === lastSyncedHistoryKeyRef.current) {
        return;
      }
      lastSyncedHistoryKeyRef.current = rowKey;
      setChartCandles(candlesFromApi(rows));
      return;
    }

    lastSyncedHistoryKeyRef.current = "";
    if (mockSeries.length) {
      setChartCandles([...mockSeries]);
    } else {
      setChartCandles(null);
    }
  }, [hasServerRows, rowKey, rows, mockSeries]);

  /** Keep last bar aligned to `base.price` / mark without resetting appended synthetic bars. */
  useEffect(() => {
    if (price == null) return;
    setChartCandles((prev) => {
      if (!prev?.length) return prev;
      return patchLastClose(prev, price);
    });
  }, [price]);

  useEffect(() => {
    if (!allowSyntheticTickStream) return;

    const id = window.setInterval(() => {
      setChartCandles((prev) => {
        if (!prev?.length) return prev;
        const last = prev[prev.length - 1];
        const nextBar = nextHybridCandle(last, price ?? undefined);
        return [...prev, nextBar].slice(-220);
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [allowSyntheticTickStream, price]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0c121e] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#1a2332] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B4F000]">
            Underlying perp
          </span>
          <span className="text-[11px] text-[#6b7c93]">Reference market</span>
        </div>
      </div>

      <div className="mb-3 shrink-0 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[#6b7c93]">{label}</div>
          <div className="text-2xl font-semibold tabular-nums text-white">
            {price != null
              ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "—"}
          </div>
        </div>
        {changePct != null ? (
          <div
            className={`text-sm font-semibold tabular-nums ${
              changePct >= 0 ? "text-[#37c8bf]" : "text-[#ef4a68]"
            }`}
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}%{" "}
            <span className="text-[11px] font-normal text-[#6b7c93]">24h</span>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/6 bg-[#0a1018]">
        {chartCandles?.length ? (
          <MiniPerpChart candles={chartCandles} className="h-full min-h-[128px] w-full min-w-0" />
        ) : (
          <div className="flex min-h-[128px] flex-1 items-center justify-center px-3 text-center text-xs text-[#5c6b82]">
            Perp series: send{" "}
            <code className="mx-1 rounded bg-black/40 px-1 py-0.5 text-[10px] text-[#8eb4ff]">
              base.history
            </code>{" "}
            (or{" "}
            <code className="mx-1 rounded bg-black/40 px-1 py-0.5 text-[10px] text-[#8eb4ff]">
              underlying_perp.candles
            </code>
            ), or rely on the in-app mock stream scaled to perp price.
          </div>
        )}
      </div>
    </section>
  );
}
