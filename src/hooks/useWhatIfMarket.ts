"use client";

import { useCallback, useEffect, useState } from "react";
import type { WhatIfMarketApiResponse } from "@/lib/api/whatIfMarket";
import { fetchWhatIfMarket } from "@/lib/api/whatIfMarket";
import { isWhatIfSymbol } from "@/lib/constants/markets";

function pollIntervalMs() {
  const raw = process.env.NEXT_PUBLIC_WHAT_IF_POLL_INTERVAL_MS;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 1000 ? n : 5000;
}

type State = {
  data: WhatIfMarketApiResponse | null;
  error: string | null;
  isLoading: boolean;
  lastUpdated: number | null;
};

const initial: State = {
  data: null,
  error: null,
  isLoading: false,
  lastUpdated: null,
};

/**
 * Polls the what-if endpoint while a what-if symbol is selected.
 * If `NEXT_PUBLIC_WHAT_IF_MARKET_API_URL` is unset, `fetchWhatIfMarket` serves the symbol-matched fixture.
 */
export function useWhatIfMarket(selectedSymbol: string) {
  const [state, setState] = useState<State>(initial);

  const refresh = useCallback(async () => {
    if (!isWhatIfSymbol(selectedSymbol)) return;

    setState((s) => ({ ...s, isLoading: s.data === null, error: null }));
    try {
      const data = await fetchWhatIfMarket(selectedSymbol);
      setState({
        data,
        error: null,
        isLoading: false,
        lastUpdated: Date.now(),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      setState((s) => ({
        ...s,
        error: message,
        isLoading: false,
        lastUpdated: Date.now(),
      }));
    }
  }, [selectedSymbol]);

  useEffect(() => {
    if (!isWhatIfSymbol(selectedSymbol)) return;

    let cancelled = false;
    const interval = pollIntervalMs();

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });

    const run = async () => {
      while (!cancelled) {
        await refresh();
        if (cancelled) break;
        await sleep(interval);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, refresh]);

  if (!isWhatIfSymbol(selectedSymbol)) {
    return { ...initial, refresh };
  }

  return { ...state, refresh };
}
