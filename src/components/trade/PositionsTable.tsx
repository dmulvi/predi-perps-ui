import type { Position } from "@/lib/mock/market";

type Props = {
  positions: Position[];
};

const tabs = ["Positions", "Open orders", "History"];

function baseAssetFromMarket(market: string) {
  const head = market.split("-")[0]?.trim();
  return head && head.length > 0 ? head : "—";
}

export function PositionsTable({ positions }: Props) {
  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-[#071e3f]">
      <div className="flex items-center gap-6 border-b border-white/10 px-4 py-3 text-xs">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={`transition ${
              index === 0 ? "text-white" : "text-white/45 hover:text-white/75"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-white/10 text-white/45">
            <tr>
              {[
                "Market",
                "Trade type",
                "Margin",
                "Notional value",
                "Unrealized PnL (ROE%)",
                "Current price",
                "Entry price",
                "Amount",
                "Liq. price",
                "Est. rebate",
              ].map((head) => (
                <th key={head} className="px-4 py-3 font-medium">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-sm text-white/45"
                >
                  No open positions
                </td>
              </tr>
            ) : (
              positions.map((position) => {
                const base = baseAssetFromMarket(position.market);
                const sideLong = position.side === "Long";
                return (
                  <tr key={position.id} className="border-b border-white/5 text-white/80">
                    <td className="px-4 py-3">{position.market}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        sideLong ? "text-[#39ff88]" : "text-[#ef4a68]"
                      }`}
                    >
                      {position.side}
                    </td>
                    <td className="px-4 py-3">{position.margin.toFixed(2)} USDC</td>
                    <td className="px-4 py-3">{position.notionalValue.toFixed(2)} USDC</td>
                    <td
                      className={`px-4 py-3 ${
                        position.unrealizedPnl >= 0 ? "text-[#39ff88]" : "text-[#ef4a68]"
                      }`}
                    >
                      {position.unrealizedPnl.toFixed(2)} USD ({position.pnlPct.toFixed(2)}%)
                    </td>
                    <td className="px-4 py-3">{position.currentPrice.toFixed(2)} USDC</td>
                    <td className="px-4 py-3">{position.entryPrice.toFixed(2)} USDC</td>
                    <td className="px-4 py-3">
                      {position.amount.toFixed(4)} {base}
                    </td>
                    <td className="px-4 py-3">{position.liqPrice.toFixed(2)} USDC</td>
                    <td className="px-4 py-3">{position.estFeeRebate}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

