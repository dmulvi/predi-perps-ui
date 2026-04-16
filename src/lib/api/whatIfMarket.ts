import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { getWhatIfMarketMockBySymbol } from "@/lib/api/fixtures/whatIf";

/**
 * **Contract (mock JSON ≡ REST body)** — same shape for market-keyed fixture files under
 * `src/lib/api/fixtures/whatIf/`
 * and `GET` responses when `NEXT_PUBLIC_WHAT_IF_MARKET_API_URL` is set:
 *
 * - **Hybrid (main chart):** top-level **`price`** = current mark; top-level **`history`** =
 *   `{ timestamp, price }[]` (Unix **seconds**) = historical marks. Full series loads on first fetch;
 *   later polls typically extend **`history`** and/or refresh **`price`**; the client reapplies the
 *   series when the snapshot changes and patches the last bar to **`price`** between longer histories.
 * - **Underlying perp (mini chart):** **`base.price`** = current perp mark; **`base.history`** =
 *   same point shape as hybrid. Legacy **`underlying_perp`** OHLC is still supported.
 * - Optional full OHLC: **`candles`** / **`hybrid_candles`** (hybrid) or **`underlying_perp.candles`**
 *   (perp) take precedence over **`history`** / **`base.history`** when present.
 *
 * If hybrid/perp OHLC and point histories are all omitted, the UI synthesizes demo series.
 */
export type WhatIfMarketApiResponse = {
  /** Mark / last traded hybrid price (USDC), from API `hybrid_price`. */
  price?: number;
  change24hPct?: number;
  change24hAbs?: number;
  volume24h?: number;
  /**
   * Hybrid instrument OHLC (perp × prediction). Same as `hybrid_candles` in snake_case payloads.
   * Drives the main chart when present.
   */
  candles?: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  /**
   * Underlying perpetual (e.g. BTC-USD) reference — raw perp before prediction adjustment.
   * Hybrid entry ≈ perpPrice × P(prediction) when using the primary outcome probability.
   */
  underlyingPerp?: {
    symbol?: string;
    price?: number;
    change24hPct?: number;
    change24hAbs?: number;
    /** Smaller candle series for the compact perp chart. */
    candles?: Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
    }>;
  };
  predictionMarket?: {
    id?: string;
    question: string;
    /** Outcome labels, e.g. ["Yes", "No"] */
    outcomes?: string[];
    /** Implied prices 0–1 or 0–100 cents — we normalize in the UI. */
    outcomePrices?: number[];
    /** Long-form rules copy from Polymarket-style APIs */
    description?: string;
    /** Primary outcome probability as string (e.g. "0.255") when outcomes not split */
    probability?: string;
    resolved?: boolean;
    startDate?: string;
    volumeUsd?: number;
    liquidityUsd?: number;
    endDate?: string;
    url?: string;
    resolutionPrice?: string | null;
    resolvedAt?: string | null;
  };
  /** Optional: how hybrid entry relates to spot + prediction (for display copy). */
  hybridNote?: string;
  /** Internal UI hint: set by fetcher to disable synthetic ticks when live API succeeds. */
  dataSource?: "api" | "mock";
};

function getApiUrl() {
  return process.env.NEXT_PUBLIC_WHAT_IF_MARKET_API_URL?.trim() ?? "";
}

function endpointForSymbol(baseUrl: string, selectedSymbol?: string) {
  if (!selectedSymbol) return baseUrl;
  return `${baseUrl.replace(/\/+$/, "")}/${selectedSymbol}`;
}

function proxyEndpointForSymbol(selectedSymbol?: string) {
  if (!selectedSymbol) return "/api/what-if/BTC-USD-WHAT-IF";
  return `/api/what-if/${encodeURIComponent(selectedSymbol)}`;
}

/** Raw REST / mock JSON before normalization (snake_case + nested polymarket). */
export type WhatIfApiRaw = {
  symbol?: string;
  price?: string | number;
  hybrid_price?: string | number;
  timestamp_us?: number;
  candles?: WhatIfMarketApiResponse["candles"];
  hybrid_candles?: WhatIfMarketApiResponse["candles"];
  underlying_perp?: {
    symbol?: string;
    price?: string | number;
    timestamp_us?: number;
    candles?: NonNullable<WhatIfMarketApiResponse["candles"]>;
  };
  polymarket?: {
    description?: string;
    resolved?: boolean;
    question?: string;
    probability?: string;
    start_date?: string;
    end_date?: string;
    resolved_at?: string | null;
    resolution_price?: string | null;
  };
  /** New API: underlying perp snapshot + { timestamp, price }[] (replaces flat `underlying_perp` for some backends). */
  base?: {
    timestamp?: number;
    symbol?: string;
    price?: string | number;
    history?: Array<{ timestamp: number; price: string | number }>;
  };
  /** New API: hybrid instrument { timestamp, price }[] when full OHLC is omitted. */
  history?: Array<{ timestamp: number; price: string | number }>;
};

function parseDecimal(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const MAX_HISTORY_DEVIATION_PCT = 0.2;

function isValidHistoryStep(prevClose: number | undefined, close: number) {
  if (!Number.isFinite(close) || close <= 0) return false;
  if (prevClose == null || !Number.isFinite(prevClose) || prevClose <= 0) return true;
  const deviation = Math.abs(close - prevClose) / prevClose;
  return deviation <= MAX_HISTORY_DEVIATION_PCT;
}

/**
 * Builds OHLC rows from `{ timestamp, price }[]` (open = previous close, high/low bracket the move).
 * `time` is Unix seconds, matching `candlesFromApi` / lightweight-charts.
 */
export function priceHistoryToOhlc(
  points: Array<{ timestamp: number; price: string | number }>
): NonNullable<WhatIfMarketApiResponse["candles"]> {
  if (!points.length) return [];
  // Treat API order as authoritative; only flip if payload is clearly newest->oldest.
  // This keeps "last history item = most recent candle before top-level price".
  const ordered =
    points.length >= 2 && points[0].timestamp > points[points.length - 1].timestamp
      ? [...points].reverse()
      : [...points];
  const out: NonNullable<WhatIfMarketApiResponse["candles"]> = [];
  let prevClose: number | undefined;
  for (let i = 0; i < ordered.length; i++) {
    const close = parseDecimal(ordered[i].price);
    if (close === undefined) continue;
    if (!isValidHistoryStep(prevClose, close)) continue;
    const open = prevClose === undefined ? close : prevClose;
    prevClose = close;
    const high = Math.max(open, close);
    const low = Math.min(open, close);
    out.push({
      time: ordered[i].timestamp,
      open,
      high,
      low,
      close,
    });
  }
  return out;
}

/**
 * Maps backend / mock JSON into the UI-facing shape (also used after a real fetch).
 */
export function normalizeWhatIfResponse(
  raw: WhatIfApiRaw | WhatIfMarketApiResponse | Record<string, unknown>
): WhatIfMarketApiResponse {
  const rawObj = raw as Record<string, unknown>;
  if (
    !("polymarket" in rawObj) &&
    !("underlying_perp" in rawObj) &&
    !("hybrid_price" in rawObj) &&
    !("base" in rawObj) &&
    !("history" in rawObj)
  ) {
    return raw as WhatIfMarketApiResponse;
  }

  const r = raw as WhatIfApiRaw & WhatIfMarketApiResponse;

  const poly = r.polymarket;
  const probStr = poly?.probability;
  const pYes = probStr != null ? parseDecimal(probStr) : undefined;
  const outcomes = ["Yes", "No"] as const;
  const outcomePrices =
    pYes != null && pYes >= 0 && pYes <= 1 ? [pYes, 1 - pYes] : undefined;

  const legacyUnderlying = r.underlying_perp ?? r.underlyingPerp;
  const baseBlock = r.base;
  const topHistory = r.history;

  const hybridFromFields =
    r.hybrid_price !== undefined
      ? parseDecimal(r.hybrid_price)
      : typeof r.price === "string" || typeof r.price === "number"
        ? parseDecimal(r.price)
        : undefined;

  const perpPriceLegacy = legacyUnderlying
    ? parseDecimal(legacyUnderlying.price)
    : undefined;
  const perpPriceFromBase = baseBlock ? parseDecimal(baseBlock.price) : undefined;
  const perpPrice = perpPriceLegacy ?? perpPriceFromBase;

  const prevPerp = r.underlyingPerp;
  const underlyingTyped = legacyUnderlying as WhatIfApiRaw["underlying_perp"] | undefined;
  const perpCandlesLegacy = underlyingTyped?.candles ?? prevPerp?.candles;
  const perpCandlesFromBase =
    baseBlock?.history?.length && !perpCandlesLegacy?.length
      ? priceHistoryToOhlc(baseBlock.history)
      : undefined;
  const perpCandles = perpCandlesLegacy?.length ? perpCandlesLegacy : perpCandlesFromBase;

  const hybridCandlesDirect =
    r.hybrid_candles?.length ? r.hybrid_candles : r.candles;
  const hybridCandlesFromHistory =
    !hybridCandlesDirect?.length && topHistory?.length
      ? priceHistoryToOhlc(topHistory)
      : undefined;
  const hybridCandles = hybridCandlesDirect?.length
    ? hybridCandlesDirect
    : hybridCandlesFromHistory;

  const underlyingPerpResolved =
    legacyUnderlying || baseBlock || perpPrice != null
      ? {
          symbol:
            legacyUnderlying?.symbol ??
            baseBlock?.symbol ??
            prevPerp?.symbol ??
            (typeof r.symbol === "string" ? r.symbol : undefined),
          price: perpPrice ?? prevPerp?.price,
          change24hPct: prevPerp?.change24hPct,
          change24hAbs: prevPerp?.change24hAbs,
          candles: perpCandles,
        }
      : prevPerp;

  return {
    price: hybridFromFields,
    underlyingPerp: underlyingPerpResolved,
    change24hPct: r.change24hPct,
    change24hAbs: r.change24hAbs,
    volume24h: r.volume24h,
    candles: hybridCandles,
    predictionMarket:
      poly?.question || r.predictionMarket
        ? {
            ...(r.predictionMarket ?? {}),
            id: r.predictionMarket?.id,
            question: poly?.question ?? r.predictionMarket?.question ?? "",
            outcomes: r.predictionMarket?.outcomes ?? [...outcomes],
            outcomePrices: r.predictionMarket?.outcomePrices ?? outcomePrices,
            description: poly?.description ?? r.predictionMarket?.description,
            probability: poly?.probability ?? r.predictionMarket?.probability,
            resolved: poly?.resolved ?? r.predictionMarket?.resolved,
            startDate: poly?.start_date ?? r.predictionMarket?.startDate,
            endDate: poly?.end_date ?? r.predictionMarket?.endDate,
            volumeUsd: r.predictionMarket?.volumeUsd,
            liquidityUsd: r.predictionMarket?.liquidityUsd,
            url: r.predictionMarket?.url,
            resolutionPrice: poly?.resolution_price ?? r.predictionMarket?.resolutionPrice,
            resolvedAt: poly?.resolved_at ?? r.predictionMarket?.resolvedAt,
          }
        : undefined,
    hybridNote: r.hybridNote,
  };
}

export function candlesFromApi(
  rows: NonNullable<WhatIfMarketApiResponse["candles"]>
): CandlestickData<UTCTimestamp>[] {
  return rows.map((row) => ({
    time: row.time as UTCTimestamp,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
  }));
}

/** Stable key for when normalized candle rows change (new poll with longer history or revised OHLC). */
export function candleRowsSignature(
  rows: Array<{ time: number; close: number }> | undefined | null
): string {
  if (!rows?.length) return "";
  const last = rows[rows.length - 1];
  return `${rows.length}:${last.time}:${last.close}`;
}

/**
 * Fetches hybrid market snapshot from:
 * `NEXT_PUBLIC_WHAT_IF_MARKET_API_URL/<selectedSymbol>`.
 * If the base URL is empty or the request fails, falls back to the symbol-matched fixture.
 */
export async function fetchWhatIfMarket(
  selectedSymbol?: string
): Promise<WhatIfMarketApiResponse> {
  const url = getApiUrl();
  const fallback = (reason?: string) => {
    if (typeof window !== "undefined" && reason) {
      console.warn(`[what-if] using mock fallback: ${reason}`);
    }
    return (
    ({
      ...normalizeWhatIfResponse(
        getWhatIfMarketMockBySymbol(selectedSymbol) as unknown as WhatIfApiRaw
      ),
      dataSource: "mock" as const,
    })
    );
  };

  if (!url) {
    return fallback("NEXT_PUBLIC_WHAT_IF_MARKET_API_URL is empty");
  }

  const endpoint = endpointForSymbol(url, selectedSymbol);
  const proxyEndpoint = proxyEndpointForSymbol(selectedSymbol);
  try {
    const res = await fetch(proxyEndpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return fallback(`HTTP ${res.status} from proxy ${proxyEndpoint} (upstream ${endpoint})`);
    const raw = (await res.json()) as Record<string, unknown>;
    return {
      ...normalizeWhatIfResponse(raw),
      dataSource: "api" as const,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown fetch error";
    return fallback(`request to ${endpoint} failed: ${message}`);
  }
}
