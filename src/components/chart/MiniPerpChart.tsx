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
  className?: string;
};

/**
 * Compact candle chart for underlying perp snapshot (what-if row).
 */
export function MiniPerpChart({ candles, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        fontSize: 10,
        textColor: "rgba(200, 210, 225, 0.75)",
        background: { type: ColorType.Solid, color: "#0c1420" },
      },
      grid: {
        vertLines: { color: "rgba(92, 111, 153, 0.15)" },
        horzLines: { color: "rgba(92, 111, 153, 0.15)" },
      },
      rightPriceScale: {
        borderColor: "rgba(92, 111, 153, 0.35)",
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "rgba(92, 111, 153, 0.35)",
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
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
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full min-h-[128px] w-full min-w-0"}
    />
  );
}
