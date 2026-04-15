/** Rough liquidation estimate (same heuristic as the order panel). */
export function estimateLiquidationPrice(
  markPrice: number,
  leverage: number,
  side: "Long" | "Short"
): number {
  if (markPrice <= 0 || leverage < 1) return 0;
  const move = 0.058 * (10 / leverage);
  if (side === "Long") {
    return markPrice * (1 - move);
  }
  return markPrice * (1 + move);
}
