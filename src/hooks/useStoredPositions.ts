"use client";

import { useCallback, useEffect, useState } from "react";

import type { Position } from "@/lib/mock/market";
import {
  loadStoredPositions,
  positionsStorageKey,
  prependPosition as prependStored,
} from "@/lib/positions/storage";

export function useStoredPositions(walletAddress: `0x${string}` | undefined) {
  const [positions, setPositions] = useState<Position[]>([]);

  const refresh = useCallback(() => {
    if (!walletAddress) {
      setPositions([]);
      return;
    }
    setPositions(loadStoredPositions(walletAddress));
  }, [walletAddress]);

  useEffect(() => {
    queueMicrotask(() => refresh());
  }, [refresh]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!walletAddress) return;
      if (e.key === positionsStorageKey(walletAddress)) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [walletAddress, refresh]);

  /** Pass `signedBy` from the wallet that signed the tx if wagmi address lags Privy. */
  const prependPosition = useCallback(
    (position: Position, signedBy?: `0x${string}`) => {
      const owner = signedBy ?? walletAddress;
      if (!owner) return;
      prependStored(owner, position);
      setPositions(loadStoredPositions(owner));
    },
    [walletAddress]
  );

  return { positions, prependPosition, refresh };
}
