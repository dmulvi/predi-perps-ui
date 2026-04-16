"use client";

import type { WhatIfMarketApiResponse } from "@/lib/api/whatIfMarket";

type Props = {
  snapshot: WhatIfMarketApiResponse | null;
  error: string | null;
  isLoading: boolean;
  lastUpdated: number | null;
  /** When true, omits duplicate header timestamps (parent section owns them). */
  embedded?: boolean;
};

function formatUsd(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function normalizePrice(p: number) {
  if (p > 1) return p / 100;
  return p;
}

export function WhatIfPredictionPanel({
  snapshot,
  error,
  isLoading,
  lastUpdated,
  embedded = false,
}: Props) {
  const pm = snapshot?.predictionMarket;
  const outcomes = pm?.outcomes?.length ? pm.outcomes : ["Yes", "No"];
  const prices = pm?.outcomePrices ?? [0.47, 0.53];

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-[#13171f] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
        embedded ? "h-full" : ""
      }`}
    >
      <div className="mb-3 shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#1e2430] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8eb4ff]">
            Polymarket
          </span>
          <span className="text-[11px] text-[#6b7c93]">Prediction layer</span>
        </div>
        {!embedded && lastUpdated ? (
          <span className="text-[10px] text-[#5c6b82]">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      {!embedded && isLoading && !snapshot ? (
        <p className="shrink-0 text-sm text-[#9aa8bc]">Loading prediction data…</p>
      ) : null}

      {error ? <p className="shrink-0 text-sm text-[#f87171]">{error}</p> : null}

      {snapshot?.hybridNote ? (
        <p className="mb-3 shrink-0 text-xs leading-relaxed text-[#8b9cb3]">
          {snapshot.hybridNote}
        </p>
      ) : null}

      <h3 className="mb-3 shrink-0 text-base font-semibold leading-snug text-white">
        {pm?.question ??
          "Will BTC close above $X this week? (placeholder — API will supply the market question)"}
      </h3>

      {pm?.description ? (
        <div className="mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/6 bg-[#0f141c]">
          <div className="shrink-0 border-b border-white/6 px-3 py-2 text-[11px] font-medium text-[#6ea8ff]">
            Rules & resolution
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#8b9cb3]">
              {pm.description}
            </p>
          </div>
        </div>
      ) : null}

      <div className="shrink-0 space-y-3">
        {outcomes.map((label, i) => {
          const raw = prices[i] ?? 0;
          const pct = Math.round(normalizePrice(raw) * 100);
          const isYes = label.toLowerCase() === "yes";
          return (
            <div key={`${label}-${i}`}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-white">{label}</span>
                <span
                  className={
                    isYes ? "font-semibold text-[#2bd08f]" : "font-semibold text-[#f472a4]"
                  }
                >
                  {pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#1e2430]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isYes
                      ? "linear-gradient(90deg,#1a5c45,#2bd08f)"
                      : "linear-gradient(90deg,#5c2d3f,#f472a4)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap gap-x-6 gap-y-1 border-t border-white/6 pt-3 text-xs text-[#8b9cb3]">
        <span>Vol. {formatUsd(pm?.volumeUsd)}</span>
        <span>Liq. {formatUsd(pm?.liquidityUsd)}</span>
        {pm?.startDate ? <span>Starts {pm.startDate}</span> : null}
        {pm?.endDate ? <span>Ends {pm.endDate}</span> : null}
      </div>

      {pm?.url ? (
        <a
          href={pm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#5da9ff] hover:text-[#8ec5ff]"
        >
          View on Polymarket →
        </a>
      ) : null}
    </section>
  );
}
