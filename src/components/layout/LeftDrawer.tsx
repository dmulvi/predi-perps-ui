"use client";

type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

export function LeftDrawer({ isOpen, onToggle }: Props) {
  return (
    <aside
      className={`hidden h-full min-h-0 shrink-0 self-stretch border-r border-white/10 bg-[#041a36] transition-all duration-300 lg:block ${
        isOpen ? "w-[340px]" : "w-16"
      }`}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={`flex h-14 items-center border-b border-white/10 ${
            isOpen ? "justify-between px-4" : "justify-center"
          }`}
        >
          <button
            onClick={onToggle}
            className="rounded-md p-2 text-[#5da9ff] transition hover:bg-white/5"
            aria-label={isOpen ? "Close drawer" : "Open drawer"}
          >
            ☰
          </button>

          {isOpen ? (
            <button
              onClick={onToggle}
              className="rounded-md p-2 text-[#6ea8ff] transition hover:bg-white/5"
              aria-label="Collapse drawer"
            >
              ↤
            </button>
          ) : null}
        </div>

        {isOpen ? (
          <div className="flex-1 space-y-7 p-6">
            <section className="border-b border-white/10 pb-6">
              <p className="text-sm font-semibold text-white/80">Your current position</p>
              <p className="mt-2 text-4xl font-semibold text-white">
                0.03 <span className="font-normal text-white/70">BTC</span>
              </p>
            </section>

            <section className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-white/80">Funds available</p>
                <p className="mt-2 text-4xl font-semibold text-white">
                  0 <span className="font-normal text-white/70">USDC</span>
                </p>
              </div>

              <button className="w-full rounded-2xl bg-[#2f4769] py-3 text-sm font-semibold text-white/35">
                Approve funds
              </button>

              <div>
                <p className="text-sm font-semibold text-white/80 underline decoration-white/35">
                  Portfolio
                </p>
                <p className="mt-2 text-4xl font-semibold text-white">
                  0.00 <span className="font-normal text-white/70">USDC</span>
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
