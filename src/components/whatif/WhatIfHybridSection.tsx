"use client";

import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import type { WhatIfMarketApiResponse } from "@/lib/api/whatIfMarket";
import { WhatIfPredictionPanel } from "@/components/whatif/WhatIfPredictionPanel";
import { WhatIfUnderlyingPerpPanel } from "@/components/whatif/WhatIfUnderlyingPerpPanel";

type Props = {
  snapshot: WhatIfMarketApiResponse | null;
  error: string | null;
  isLoading: boolean;
  /** Scaled mock perp series when API omits `underlyingPerp.candles` (same stream as the main page mock). */
  perpMockCandles: CandlestickData<UTCTimestamp>[];
};

export function WhatIfHybridSection({ snapshot, error, isLoading, perpMockCandles }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {error ? <p className="shrink-0 text-sm text-[#f87171]">{error}</p> : null}

      {isLoading && !snapshot ? (
        <p className="shrink-0 text-sm text-[#9aa8bc]">Loading hybrid market data…</p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] *:min-h-0">
        <WhatIfPredictionPanel
          snapshot={snapshot}
          error={null}
          isLoading={isLoading}
          lastUpdated={null}
          embedded
        />
        <WhatIfUnderlyingPerpPanel snapshot={snapshot} mockSeries={perpMockCandles} />
      </div>
    </div>
  );
}
