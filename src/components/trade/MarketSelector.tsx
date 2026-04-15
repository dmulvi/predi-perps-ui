"use client";

import { useMemo, useRef, useState } from "react";
import type { MarketCategory, MarketListItem } from "@/lib/mock/market";
import { marketCategories } from "@/lib/mock/market";

type Props = {
  selectedSymbol: string;
  items: MarketListItem[];
  onSelect: (symbol: string) => void;
};

function fmtPrice(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toFixed(4).replace(/\.?0+$/, "");
}

function fmtVol(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function MarketSelector({ selectedSymbol, items, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MarketCategory>("Crypto");
  const panelRef = useRef<HTMLDivElement | null>(null);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (item.category !== activeTab) return false;
      if (!q) return true;
      return item.symbol.toLowerCase().includes(q);
    });
  }, [activeTab, items, query]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-left text-xl font-semibold transition hover:bg-white/10"
      >
        <span>{selectedSymbol}</span>
        <span className={`text-sm text-white/70 transition ${open ? "rotate-180" : ""}`}>⌃</span>
      </button>

      {open ? (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close market selector"
          />
          <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-[min(920px,92vw)] rounded-3xl border border-white/10 bg-[#102749] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="rounded-2xl border border-white/10 bg-[#071d39] px-4 py-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-lg text-white outline-none placeholder:text-white/45"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-6 border-b border-white/10 pb-2 text-[34px]">
              {marketCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveTab(category)}
                  className={`pb-2 text-lg font-semibold transition ${
                    activeTab === category
                      ? "border-b-2 border-[#5da9ff] text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left">
                <thead className="bg-[#0d2344] text-white/70">
                  <tr>
                    <th className="px-4 py-3 text-[30px] font-semibold">Symbol</th>
                    <th className="px-4 py-3 text-sm font-semibold">Last price</th>
                    <th className="px-4 py-3 text-sm font-semibold">24 hr</th>
                    <th className="px-4 py-3 text-sm font-semibold">Volume</th>
                  </tr>
                </thead>
                <tbody className="bg-[#102749]">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-white/55">
                        No markets found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.symbol}
                        className="border-t border-white/10 text-white/85 transition hover:bg-white/5"
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              onSelect(item.symbol);
                              setOpen(false);
                            }}
                            className="text-sm font-medium"
                          >
                            {item.symbol}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">{fmtPrice(item.lastPrice)}</td>
                        <td
                          className={`px-4 py-3 text-sm ${
                            item.changePct24h >= 0 ? "text-[#4ad28a]" : "text-[#ef4a68]"
                          }`}
                        >
                          {item.changePct24h.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-sm">{fmtVol(item.volume)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

