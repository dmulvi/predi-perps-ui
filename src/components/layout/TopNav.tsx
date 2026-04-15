"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

function truncAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function TopNav() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const walletLabel = walletAddress ? truncAddress(walletAddress) : "Connect";
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!walletMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!walletMenuRef.current) return;
      if (walletMenuRef.current.contains(event.target as Node)) return;
      setWalletMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [walletMenuOpen]);

  return (
    <header className="h-16 border-b border-white/10 bg-[#041631] px-4 md:px-6">
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center gap-4">
        <div className="flex shrink-0 items-center leading-none">
          <Image
            src="/prediperps-logo.svg"
            alt="PrediPerps"
            width={392}
            height={56}
            className="block h-8 w-auto max-h-8 max-w-[min(220px,46vw)] object-contain object-left md:h-9 md:max-h-9"
            priority
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <nav className="hidden items-center gap-8 text-md mr-8 md:flex">
            <button className="cursor-pointer font-semibold text-[#6ea8ff] transition hover:text-[#84b7ff]">
              Perpetuals
            </button>
            <button className="cursor-pointer font-semibold text-white/75 transition hover:text-white">
              Waitlist
            </button>
          </nav>

          <div className="relative flex items-center gap-3" ref={walletMenuRef}>
            {!process.env.NEXT_PUBLIC_PRIVY_APP_ID ? (
              <div className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">
                Set NEXT_PUBLIC_PRIVY_APP_ID
              </div>
            ) : null}

            <button className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 lg:flex">
              ☼
            </button>

            <button className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10 lg:flex">
              <span className="text-lg leading-none">◈</span>
              <span>Arbitrum Sepolia</span>
              <span className="text-white/60">⌄</span>
            </button>

            {authenticated ? (
              <>
                <button
                  onClick={() => setWalletMenuOpen((prev) => !prev)}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {walletLabel} <span className="ml-2 text-white/60">⌄</span>
                </button>

                {walletMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[min(480px,92vw)] rounded-3xl border border-white/10 bg-[#102749] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                    <h3 className="text-4xl font-semibold text-white">Wallets</h3>
                    <p className="mt-1 text-sm text-white/65">
                      Connect and link wallets to your account
                    </p>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-[#112e55] p-4">
                        <div className="text-sm font-medium text-white">Privy (Embedded)</div>
                        <div className="mt-1 text-sm text-white/60">
                          {truncAddress(user?.id || "0x7315af76cbee")}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#5da9ff] bg-[#0f294f] p-4 shadow-[inset_0_0_0_1px_rgba(93,169,255,0.35)]">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">MetaMask</div>
                            <div className="mt-1 text-sm text-white/70">{walletLabel}</div>
                          </div>
                          <span className="rounded-full bg-[#274877] px-3 py-1 text-xs font-medium text-[#7bb6ff]">
                            Active
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={login}
                        className="w-full rounded-2xl border border-[#4b89df] bg-transparent px-4 py-3 text-sm font-semibold text-[#7fb7ff] transition hover:bg-[#1a3a69]"
                      >
                        + Link a wallet
                      </button>

                      <button
                        onClick={() => {
                          setWalletMenuOpen(false);
                          logout();
                        }}
                        className="w-full rounded-xl py-2 text-sm text-white/85 transition hover:bg-white/5"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <button
                onClick={login}
                disabled={!ready}
                className="rounded-2xl border border-[#17355c] bg-[#0d2a4d] px-5 py-2 text-sm font-semibold text-[#7fb7ff] transition hover:bg-[#123862] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
