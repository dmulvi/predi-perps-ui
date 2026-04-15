import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import whatIfMarketMock from "@/lib/api/fixtures/whatIfMarket.mock.json";

/**
 * **Main chart (hybrid perp × prediction)** — what the backend should send for history:
 *
 * - **`hybrid_price`** (or `price` after normalization): authoritative **last/mark** for the hybrid
 *   instrument in USDC. The UI snaps the latest bar’s close to this on each poll.
 * - **`candles`** or **`hybrid_candles`**: optional OHLC series for the **hybrid** contract (same
 *   instrument as `hybrid_price`). Each bar:
 *   - `time`: Unix **seconds** (UTC), ascending, non-overlapping (e.g. 1m bars → +60 per step).
 *   - `open`, `high`, `low`, `close`: USDC; `high`/`low` must bracket `open`/`close`.
 * - If hybrid OHLC is omitted, the client synthesizes history anchored near `hybrid_price` for demos.
 *
 * Underlying perp mini-chart: optional `underlying_perp.candles` with the same OHLC shape (perp USDC),
 * or the UI can fall back to the global mock tick stream scaled to `underlying_perp.price`.
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
  };
  /** Optional: how hybrid entry relates to spot + prediction (for display copy). */
  hybridNote?: string;
};

function getApiUrl() {
  return process.env.NEXT_PUBLIC_WHAT_IF_MARKET_API_URL?.trim() ?? "";
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
};

function parseDecimal(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
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
    !("hybrid_price" in rawObj)
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

  const underlying = r.underlying_perp ?? r.underlyingPerp;
  const hybridFromFields =
    r.hybrid_price !== undefined
      ? parseDecimal(r.hybrid_price)
      : typeof r.price === "string" || typeof r.price === "number"
        ? parseDecimal(r.price)
        : undefined;

  const perpPrice = underlying ? parseDecimal(underlying.price) : undefined;

  const prevPerp = r.underlyingPerp;
  const underlyingTyped = underlying as WhatIfApiRaw["underlying_perp"] | undefined;
  const hybridCandles =
    r.hybrid_candles?.length ? r.hybrid_candles : r.candles;

  return {
    price: hybridFromFields,
    underlyingPerp:
      underlying || perpPrice != null
        ? {
            symbol: underlying?.symbol ?? prevPerp?.symbol ?? r.symbol,
            price: perpPrice ?? prevPerp?.price,
            change24hPct: prevPerp?.change24hPct,
            change24hAbs: prevPerp?.change24hAbs,
            candles: underlyingTyped?.candles ?? prevPerp?.candles,
          }
        : prevPerp,
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

/**
 * Fetches hybrid market snapshot. If `NEXT_PUBLIC_WHAT_IF_MARKET_API_URL` is empty,
 * returns the normalized [fixture](fixtures/whatIfMarket.mock.json) (same shape as the REST API).
 */
export async function fetchWhatIfMarket(): Promise<WhatIfMarketApiResponse> {
  const url = getApiUrl();
  if (!url) {
    return normalizeWhatIfResponse(whatIfMarketMock as unknown as WhatIfApiRaw);
  }

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`What-if API error: ${res.status} ${res.statusText}`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeWhatIfResponse(raw);
}
