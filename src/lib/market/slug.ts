import type { MarketListItem } from "@/lib/mock/market";

/** URL segment for `/market/[slug]`, e.g. `BTC-USD-WHAT-IF` → `btc-usd-what-if`. */
export function symbolToSlug(symbol: string): string {
  return symbol.trim().toLowerCase().replace(/_/g, "-");
}

/** Resolve slug from the path back to a market symbol, or `undefined` if unknown. */
export function slugToMarketSymbol(
  slug: string,
  items: MarketListItem[]
): string | undefined {
  const n = slug.trim().toLowerCase().replace(/_/g, "-");
  return items.find((i) => symbolToSlug(i.symbol) === n)?.symbol;
}
