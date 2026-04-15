"use client";

import { useMemo } from "react";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import type { WhatIfMarketApiResponse } from "@/lib/api/whatIfMarket";
import { candlesFromApi } from "@/lib/api/whatIfMarket";
import { MiniPerpChart } from "@/components/chart/MiniPerpChart";

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

  const perpCandles = useMemo(() => {
    const rows = perp?.candles;
    if (rows?.length) return candlesFromApi(rows);
    if (mockSeries.length) return mockSeries;
    return null;
  }, [perp?.candles, mockSeries]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0c121e] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#1a2332] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8eb4ff]">
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
        {perpCandles?.length ? (
          <MiniPerpChart candles={perpCandles} className="h-full min-h-[128px] w-full min-w-0" />
        ) : (
          <div className="flex min-h-[128px] flex-1 items-center justify-center px-3 text-center text-xs text-[#5c6b82]">
            Perp candles: send{" "}
            <code className="mx-1 rounded bg-black/40 px-1 py-0.5 text-[10px] text-[#8eb4ff]">
              underlying_perp.candles
            </code>{" "}
            from the API, or rely on the in-app mock stream (scaled to perp price).
          </div>
        )}
      </div>
    </section>
  );
}
