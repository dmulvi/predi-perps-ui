"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";

/**
 * Wagmi + Privy can briefly disagree on the active address; the wallet that
 * signs txs should match the key we use for `localStorage` position rows.
 */
export function useEffectiveWalletAddress(): `0x${string}` | undefined {
  const { address: wagmiAddress } = useAccount();
  const { user } = usePrivy();

  return useMemo(() => {
    if (wagmiAddress && isAddress(wagmiAddress)) {
      return wagmiAddress;
    }
    const fromPrivy = user?.wallet?.address;
    if (fromPrivy && isAddress(fromPrivy)) {
      return fromPrivy as `0x${string}`;
    }
    return undefined;
  }, [wagmiAddress, user?.wallet?.address]);
}
