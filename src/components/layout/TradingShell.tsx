"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { isWhatIfSymbol, WHAT_IF_SYMBOL } from "@/lib/constants/markets";
import { useWhatIfHybridChart } from "@/hooks/useWhatIfHybridChart";
import { useWhatIfMarket } from "@/hooks/useWhatIfMarket";
import { symbolToSlug } from "@/lib/market/slug";
import { marketList, type Position } from "@/lib/mock/market";

const WHAT_IF_BASE_VOLUME_USDC = 24_000;

function formatUsdcVolumeShort(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Fixed column widths so header metrics don’t jump when values update. */
const HEADER_STAT_BADGE_CLASS: Record<string, string> = {
  Price: "w-[8.5rem]",
  "24h Change": "w-[10rem]",
  "24h Volume": "w-[7.5rem]",
  "24h Rebates (L/S)": "w-[12rem]",
};

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

  /** Mock "24h open" for BTC-USD-WHAT-IF — fixed per visit, change updates with each price tick. */
  const [whatIfMock24hOpen, setWhatIfMock24hOpen] = useState<number | null>(null);
  /** Extra volume from positions opened this session (base 24K). */
  const [whatIfSessionVolumeExtra, setWhatIfSessionVolumeExtra] = useState(0);

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

  const lastChartClose = chartCandles[chartCandles.length - 1]?.close;
  const markPrice =
    lastChartClose ??
    (isWhatIf ? whatIf.data?.price : undefined) ??
    selectedMarket.lastPrice;

  useEffect(() => {
    if (!isWhatIf) {
      setWhatIfMock24hOpen(null);
      setWhatIfSessionVolumeExtra(0);
    }
  }, [isWhatIf]);

  useEffect(() => {
    if (!isWhatIf || whatIfMock24hOpen != null) return;
    if (markPrice <= 0) return;
    /** Reference “open” ~2% below current so 24h change reads ~+2% (drifts slightly as price ticks). */
    setWhatIfMock24hOpen(markPrice / 1.02);
  }, [isWhatIf, whatIfMock24hOpen, markPrice]);

  const handlePositionOpened = useCallback(
    (position: Position, signedBy?: `0x${string}`) => {
      prependPosition(position, signedBy);
      if (position.market === WHAT_IF_SYMBOL) {
        setWhatIfSessionVolumeExtra((v) => v + position.notionalValue);
      }
    },
    [prependPosition]
  );

  const headerStats = useMemo(() => {
    if (isWhatIf) {
      const open = whatIfMock24hOpen;
      const changePct =
        open != null && open > 0 ? ((markPrice - open) / open) * 100 : 0;
      const changeAbs = open != null ? markPrice - open : 0;
      const volTotal = WHAT_IF_BASE_VOLUME_USDC + whatIfSessionVolumeExtra;

      return [
        {
          label: "Price",
          value: `$${markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          tone: "neutral" as const,
        },
        {
          label: "24h Change",
          value: `${changeAbs >= 0 ? "+" : ""}${changeAbs.toFixed(2)} ${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`,
          tone: changePct >= 0 ? ("positive" as const) : ("negative" as const),
        },
        {
          label: "24h Volume",
          value: `${formatUsdcVolumeShort(volTotal)} USDC`,
          tone: "neutral" as const,
        },
        {
          label: "24h Rebates (L/S)",
          value: (
            <>
              <span className="text-[#37c8bf]">0.00</span>
              <span className="text-white/45"> / </span>
              <span className="text-[#ef4a68]">0.00</span>
              <span className="text-white/50"> USDC</span>
            </>
          ),
          tone: "neutral" as const,
        },
      ];
    }

    const changePct = selectedMarket.changePct24h;
    const changeAbs = selectedMarket.lastPrice * (selectedMarket.changePct24h / 100);

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
        value: `${selectedMarket.volume.toLocaleString(undefined, { maximumFractionDigits: 1 })} USDC`,
        tone: "neutral" as const,
      },
      {
        label: "24h Rebates (L/S)",
        value: `${selectedMarket.rebateLong.toFixed(2)} / ${selectedMarket.rebateShort.toFixed(2)} USDC`,
        tone: "neutral" as const,
      },
    ];
  }, [
    isWhatIf,
    markPrice,
    selectedMarket,
    whatIfMock24hOpen,
    whatIfSessionVolumeExtra,
  ]);

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
            <div className="mb-4 flex shrink-0 flex-wrap items-center gap-y-2 border-b border-white/10 pb-3">
              <div className="min-w-0 shrink-0">
                <MarketSelector
                  selectedSymbol={selectedSymbol}
                  items={marketList}
                  onSelect={(symbol) => {
                    router.push(`/market/${symbolToSlug(symbol)}`);
                  }}
                />
              </div>
              {headerStats.map((item) => (
                <div key={item.label} className="flex shrink-0 items-center">
                  <div
                    className="mx-3 h-9 w-px shrink-0 bg-white/8"
                    aria-hidden
                  />
                  <StatBadge
                    label={item.label}
                    value={item.value}
                    tone={item.tone}
                    className={
                      HEADER_STAT_BADGE_CLASS[item.label] ?? "w-32"
                    }
                  />
                </div>
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
                onPositionOpened={handlePositionOpened}
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
