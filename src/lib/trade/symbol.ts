/** Normalized market id passed to `openPosition` (lowercase, hyphenated). */
export function symbolToContractMarket(symbol: string): string {
  return symbol.trim().toLowerCase().replace(/_/g, "-");
}
