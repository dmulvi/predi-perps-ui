"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useParams } from "next/navigation";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { TradingShell } from "@/components/layout/TradingShell";
import { slugToMarketSymbol } from "@/lib/market/slug";
import { marketList, nextCandle, seedCandles } from "@/lib/mock/market";

export default function MarketPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string"
      ? slugParam
      : Array.isArray(slugParam)
        ? slugParam[0] ?? ""
        : "";

  const selectedSymbol = useMemo(() => {
    if (!slug) return undefined;
    return slugToMarketSymbol(slug, marketList);
  }, [slug]);

  const [candles, setCandles] = useState<CandlestickData<UTCTimestamp>[]>(() =>
    seedCandles(160)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCandles((previous) => {
        const last = previous[previous.length - 1];
        if (!last) return previous;

        const next = nextCandle(last);
        const updated = [...previous, next];
        return updated.slice(-220);
      });
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  if (slug && selectedSymbol === undefined) {
    notFound();
  }

  const symbol = selectedSymbol ?? "BTC-USD";

  return <TradingShell candles={candles} selectedSymbol={symbol} />;
}
