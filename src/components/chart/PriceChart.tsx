"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

type Props = {
  candles: CandlestickData<UTCTimestamp>[];
  /**
   * When true, the chart stretches to fill the parent (use a flex parent with min-h-0 + flex-1).
   * When false, uses a fixed chart height suitable for mixed layouts (e.g. what-if).
   */
  fillContainer?: boolean;
};

export function PriceChart({ candles, fillContainer = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        textColor: "rgba(226, 232, 240, 0.75)",
        background: { type: ColorType.Solid, color: "#051b3a" },
      },
      grid: {
        vertLines: { color: "rgba(92, 111, 153, 0.24)" },
        horzLines: { color: "rgba(92, 111, 153, 0.24)" },
      },
      rightPriceScale: {
        borderColor: "rgba(92, 111, 153, 0.45)",
      },
      timeScale: {
        borderColor: "rgba(92, 111, 153, 0.45)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(251, 61, 114, 0.6)" },
        horzLine: { color: "rgba(251, 61, 114, 0.45)" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#37c8bf",
      downColor: "#ef4a68",
      borderVisible: false,
      wickUpColor: "#37c8bf",
      wickDownColor: "#ef4a68",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;
    seriesRef.current.setData(candles);
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className={
        fillContainer
          ? "h-full min-h-[280px] w-full min-w-0 flex-1"
          : "h-[460px] w-full shrink-0"
      }
    />
  );
}

