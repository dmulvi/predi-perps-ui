import type { Position } from "@/lib/mock/market";

import { estimateLiquidationPrice } from "@/lib/trade/estimateLiq";

type BuildArgs = {
  id: string;
  displaySymbol: string;
  side: "Long" | "Short";
  margin: number;
  leverage: number;
  markPrice: number;
  txHash: `0x${string}`;
};

export function buildPositionRow(args: BuildArgs): Position {
  const notionalValue = args.margin * args.leverage;
  const amount = args.markPrice > 0 ? notionalValue / args.markPrice : 0;
  const liqPrice = estimateLiquidationPrice(
    args.markPrice,
    args.leverage,
    args.side
  );

  return {
    id: args.id,
    market: args.displaySymbol,
    side: args.side,
    margin: args.margin,
    notionalValue,
    unrealizedPnl: 0,
    pnlPct: 0,
    currentPrice: args.markPrice,
    entryPrice: args.markPrice,
    amount,
    liqPrice,
    estFeeRebate: "--",
    leverage: args.leverage,
    txHash: args.txHash,
    openedAt: Date.now(),
  };
}
