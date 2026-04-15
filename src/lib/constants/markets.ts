/** Hybrid perp + Polymarket prediction — polled from team REST API when selected. */
export const WHAT_IF_SYMBOL = "BTC-USD-WHAT-IF" as const;

export function isWhatIfSymbol(symbol: string) {
  return symbol === WHAT_IF_SYMBOL;
}
