"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { LeftDrawer } from "@/components/layout/LeftDrawer";
import { PriceChart } from "@/components/chart/PriceChart";
import { TopNav } from "@/components/layout/TopNav";
import { MarketSelector } from "@/components/trade/MarketSelector";
import { OrderPanel } from "@/components/trade/OrderPanel";
import { PositionsTable } from "@/components/trade/PositionsTable";
import { StatBadge } from "@/components/ui/StatBadge";
import { WhatIfHybridSection } from "@/components/whatif/WhatIfHybridSection";
import { useEffectiveWalletAddress } from "@/hooks/useEffectiveWalletAddress";
import { useStoredPositions } from "@/hooks/useStoredPositions";
import { isWhatIfSymbol } from "@/lib/constants/markets";
import { useWhatIfHybridChart } from "@/hooks/useWhatIfHybridChart";
import { useWhatIfMarket } from "@/hooks/useWhatIfMarket";
import { symbolToSlug } from "@/lib/market/slug";
import { marketList } from "@/lib/mock/market";

type Props = {
  candles: CandlestickData<UTCTimestamp>[];
  /** Driven by `/market/[slug]` — do not keep a duplicate in local state. */
  selectedSymbol: string;
};

export function TradingShell({ candles, selectedSymbol }: Props) {
  const router = useRouter();
  const effectiveAddress = useEffectiveWalletAddress();
  const [side, setSide] = useState<"Long" | "Short">("Long");
  const [orderType, setOrderType] = useState<"Market" | "Limit">("Market");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const selectedMarket = marketList.find((item) => item.symbol === selectedSymbol) ?? marketList[0];

  const { positions: walletPositions, prependPosition } =
    useStoredPositions(effectiveAddress);

  const positionsForTable = walletPositions;

  const whatIf = useWhatIfMarket(selectedSymbol);

  // Anchor chart level to the market list price only when the user changes symbol (or list price),
  // not on every live candle tick. Otherwise scale = lastPrice / lastRawClose pins the displayed
  // price to the static quote (e.g. WTI stuck at 91.11) while candles still animate.
  const priceScale = useMemo(() => {
    if (candles.length === 0) return 1;
    const lastClose = candles[candles.length - 1]?.close;
    if (lastClose == null || lastClose === 0) return 1;
    return selectedMarket.lastPrice / lastClose;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit `candles`: re-anchor only on symbol / reference price
  }, [selectedSymbol, selectedMarket.lastPrice]);

  const displayCandles = useMemo(() => {
    if (candles.length === 0) return candles;

    return candles.map((candle) => ({
      ...candle,
      open: Number((candle.open * priceScale).toFixed(3)),
      high: Number((candle.high * priceScale).toFixed(3)),
      low: Number((candle.low * priceScale).toFixed(3)),
      close: Number((candle.close * priceScale).toFixed(3)),
    }));
  }, [candles, priceScale]);

  const isWhatIf = isWhatIfSymbol(selectedSymbol);

  const hybridChartCandles = useWhatIfHybridChart({
    selectedSymbol,
    apiData: whatIf.data,
    fallbackAnchorPrice: selectedMarket.lastPrice,
  });

  const chartCandles = isWhatIf ? hybridChartCandles : displayCandles;

  /** Re-anchor to API perp price when symbol / snapshot changes, not on every mock candle tick. */
  const perpPriceScale = useMemo(() => {
    if (!isWhatIf || candles.length === 0) return 1;
    const anchor = whatIf.data?.underlyingPerp?.price;
    const lastClose = candles[candles.length - 1]?.close;
    if (anchor == null || lastClose == null || lastClose === 0) return 1;
    return anchor / lastClose;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit `candles`: same pattern as `priceScale` above
  }, [isWhatIf, selectedSymbol, whatIf.data?.underlyingPerp?.price]);

  /** Page-level mock tick stream (BTC-ish), scaled to perp for the mini chart when `underlyingPerp.candles` is absent. */
  const perpMiniMockCandles = useMemo(() => {
    if (!isWhatIf || candles.length === 0) return [];
    return candles.map((candle) => ({
      ...candle,
      open: Number((candle.open * perpPriceScale).toFixed(3)),
      high: Number((candle.high * perpPriceScale).toFixed(3)),
      low: Number((candle.low * perpPriceScale).toFixed(3)),
      close: Number((candle.close * perpPriceScale).toFixed(3)),
    }));
  }, [isWhatIf, candles, perpPriceScale]);

  const markPrice =
    isWhatIfSymbol(selectedSymbol) && whatIf.data?.price != null
      ? whatIf.data.price
      : (chartCandles[chartCandles.length - 1]?.close ?? selectedMarket.lastPrice);

  const headerStats = useMemo(() => {
    const api = whatIf.data;
    const changePct =
      isWhatIfSymbol(selectedSymbol) && api?.change24hPct != null
        ? api.change24hPct
        : selectedMarket.changePct24h;
    const changeAbs =
      isWhatIfSymbol(selectedSymbol) && api?.change24hAbs != null
        ? api.change24hAbs
        : selectedMarket.lastPrice * (selectedMarket.changePct24h / 100);
    const vol =
      isWhatIfSymbol(selectedSymbol) && api?.volume24h != null
        ? api.volume24h
        : selectedMarket.volume;

    return [
      {
        label: "Price",
        value: `$${markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        tone: "neutral" as const,
      },
      {
        label: "24h Change",
        value: `${changeAbs.toFixed(4)} ${changePct.toFixed(2)}%`,
        tone: changePct >= 0 ? ("positive" as const) : ("negative" as const),
      },
      {
        label: "24h Volume",
        value: `${vol.toLocaleString(undefined, { maximumFractionDigits: 1 })} USDC`,
        tone: "neutral" as const,
      },
      {
        label: "24h Rebates (L/S)",
        value: `${selectedMarket.rebateLong.toFixed(2)} / ${selectedMarket.rebateShort.toFixed(2)} USDC`,
        tone: "neutral" as const,
      },
    ];
  }, [markPrice, selectedMarket, whatIf.data, selectedSymbol]);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-[#03142d] text-white">
      <TopNav />

      <main className="flex min-h-0 w-full flex-1 flex-row overflow-hidden">
        <LeftDrawer
          isOpen={isDrawerOpen}
          onToggle={() => setIsDrawerOpen((previous) => !previous)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <section className="flex min-h-0 flex-1 flex-col border-b border-r border-white/10 bg-[#071e3f] p-3 md:p-4">
            <div className="mb-4 flex shrink-0 flex-wrap items-center gap-4 border-b border-white/10 pb-3">
              <MarketSelector
                selectedSymbol={selectedSymbol}
                items={marketList}
                onSelect={(symbol) => {
                  router.push(`/market/${symbolToSlug(symbol)}`);
                }}
              />
              {headerStats.map((item) => (
                <StatBadge
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                <div
                  className={`flex rounded-xl border border-white/10 bg-[#051b3a] p-2 ${
                    isWhatIf ? "min-h-0 shrink-0" : "min-h-0 flex-1 flex-col overflow-hidden"
                  }`}
                >
                  <PriceChart candles={chartCandles} fillContainer={!isWhatIf} />
                </div>
                {isWhatIf ? (
                  <WhatIfHybridSection
                    snapshot={whatIf.data}
                    error={whatIf.error}
                    isLoading={whatIf.isLoading}
                    perpMockCandles={perpMiniMockCandles}
                  />
                ) : null}
              </div>
              <OrderPanel
                selectedSymbol={selectedSymbol}
                markPrice={markPrice}
                side={side}
                setSide={setSide}
                orderType={orderType}
                setOrderType={setOrderType}
                onPositionOpened={prependPosition}
              />
            </div>
          </section>

          <div className="shrink-0 border-r border-white/10 bg-[#071e3f] p-3 md:p-4">
            <PositionsTable positions={positionsForTable} />
          </div>
        </div>
      </main>
    </div>
  );
}
