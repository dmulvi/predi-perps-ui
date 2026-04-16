import btcUsdWhatIfMock from "@/lib/api/fixtures/btc-what-if.mock.json";
import wtiUsdWhatIfMock from "@/lib/api/fixtures/wti-what-if.mock.json";

type WhatIfFixture = Record<string, unknown>;

const BTC_USD_WHAT_IF = "BTC-USD-WHAT-IF";
const WTI_USD_WHAT_IF = "WTI-USD-WHAT-IF";

const fixtureBySymbol: Record<string, WhatIfFixture> = {
  [BTC_USD_WHAT_IF]: btcUsdWhatIfMock as WhatIfFixture,
  [WTI_USD_WHAT_IF]: wtiUsdWhatIfMock as WhatIfFixture,
};

/**
 * Returns a local what-if fixture for a given market symbol.
 * Add new entries to `fixtureBySymbol` as additional what-if markets are introduced.
 */
export function getWhatIfMarketMockBySymbol(symbol: string | undefined): WhatIfFixture {
  if (!symbol) return fixtureBySymbol[BTC_USD_WHAT_IF];
  return fixtureBySymbol[symbol] ?? fixtureBySymbol[BTC_USD_WHAT_IF];
}
