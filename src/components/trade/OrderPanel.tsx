"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useConfig,
  useConnect,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { getPublicClient, waitForTransactionReceipt } from "@wagmi/core";
import { formatUnits, maxUint256, parseUnits } from "viem";

import { erc20Abi, prediPerpsVaultAbi } from "@/lib/contracts/abi";
import { contractsConfigured, usdcAddress, vaultAddress } from "@/lib/contracts/env";
import { getEip1559GasForWrite } from "@/lib/tx/eip1559Gas";
import { buildPositionRow } from "@/lib/trade/buildPosition";
import { symbolToContractMarket } from "@/lib/trade/symbol";
import type { Position } from "@/lib/mock/market";

const LONG_GREEN = "#39ff88";

type Props = {
  selectedSymbol: string;
  markPrice: number;
  side: "Long" | "Short";
  setSide: (side: "Long" | "Short") => void;
  orderType: "Market" | "Limit";
  setOrderType: (orderType: "Market" | "Limit") => void;
  /** Second arg: address that signed (always pass from `useAccount` for storage key parity). */
  onPositionOpened?: (position: Position, signedBy: `0x${string}`) => void;
};

function baseAssetFromSymbol(symbol: string) {
  return symbol.split("-")[0] ?? symbol;
}

function estimateFeesFromGrossNotional(grossNotional: number) {
  /** 45 bps = 0.45% of notional. */
  return grossNotional * 0.0045;
}

export function OrderPanel({
  selectedSymbol,
  markPrice,
  side,
  setSide,
  orderType,
  setOrderType,
  onPositionOpened,
}: Props) {
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { switchChainAsync, isPending: switchPending } = useSwitchChain();
  const { writeContractAsync, isPending: writePending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const baseAsset = baseAssetFromSymbol(selectedSymbol);
  const [marginInput, setMarginInput] = useState("100");
  const [leverage, setLeverage] = useState(10);
  const [detailsOpen, setDetailsOpen] = useState(true);
  /** Size field shows notional in USDC or position size in base asset; click badge to switch. */
  const [sizeUnit, setSizeUnit] = useState<"usdc" | "base">("usdc");

  const margin = useMemo(() => {
    const n = parseFloat(marginInput.replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [marginInput]);

  const grossNotionalValue = margin * leverage;
  const fees = estimateFeesFromGrossNotional(grossNotionalValue);
  const effectiveMargin = Math.max(0, margin - fees);
  const notionalValue = effectiveMargin * leverage;
  const positionAsset = markPrice > 0 ? notionalValue / markPrice : 0;

  const setMarginFromNotional = (netNotional: number) => {
    const n = Math.max(0, netNotional);
    if (leverage <= 0) {
      setMarginInput("0");
      return;
    }
    // Invert: netNotional = (margin - fees(grossNotional)) * leverage
    // where grossNotional = margin * leverage and fees are tiny but non-zero.
    let grossNotional = n;
    for (let i = 0; i < 3; i += 1) {
      const fee = estimateFeesFromGrossNotional(grossNotional);
      grossNotional = n + fee * leverage;
    }
    const m = grossNotional / leverage;
    if (!Number.isFinite(m)) {
      setMarginInput("0");
      return;
    }
    setMarginInput(m < 100 ? m.toFixed(2) : String(Math.round(m)));
  };

  const sizeDisplayValue = useMemo(() => {
    if (sizeUnit === "usdc") {
      if (notionalValue <= 0) return "0";
      return Number.isInteger(notionalValue)
        ? String(notionalValue)
        : notionalValue.toFixed(2);
    }
    if (markPrice <= 0 || notionalValue <= 0) return "0";
    const base = notionalValue / markPrice;
    if (base >= 1) return base.toFixed(4);
    if (base >= 0.0001) return base.toFixed(6);
    return base.toFixed(8);
  }, [sizeUnit, notionalValue, markPrice]);

  const estLiqPrice = useMemo(() => {
    if (markPrice <= 0 || leverage < 1) return 0;
    const move = 0.058 * (10 / leverage);
    if (side === "Long") {
      return markPrice * (1 - move);
    }
    return markPrice * (1 + move);
  }, [markPrice, leverage, side]);

  const onMarginChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    setMarginInput(cleaned);
  };

  const onSizeFieldChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    const v = parseFloat(cleaned);
    if (!Number.isFinite(v) || v < 0) {
      setMarginInput("0");
      return;
    }
    if (sizeUnit === "usdc") {
      setMarginFromNotional(v);
      return;
    }
    if (markPrice <= 0) return;
    setMarginFromNotional(v * markPrice);
  };

  const USDC_NOTIONAL_STEP = 10;
  const onSizeStep = (direction: 1 | -1) => {
    if (sizeUnit === "usdc") {
      setMarginFromNotional(notionalValue + direction * USDC_NOTIONAL_STEP);
      return;
    }
    if (markPrice <= 0) return;
    const baseStep =
      positionAsset >= 1 ? 0.0001 : positionAsset >= 0.01 ? 0.00001 : 0.000001;
    const deltaBase = direction * baseStep;
    const nextBase = Math.max(0, positionAsset + deltaBase);
    setMarginFromNotional(nextBase * markPrice);
  };

  const leverageMarks = [1, 5, 10, 15, 20];

  const ready = contractsConfigured() && vaultAddress && usdcAddress;

  const { data: decimalsData } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: ready && !!usdcAddress,
    },
  });

  const decimals =
    typeof decimalsData === "number"
      ? decimalsData
      : typeof decimalsData === "bigint"
        ? Number(decimalsData)
        : 6;

  const marginWei = useMemo(() => {
    try {
      return parseUnits(effectiveMargin.toFixed(decimals), decimals);
    } catch {
      return BigInt(0);
    }
  }, [effectiveMargin, decimals]);

  const {
    data: allowanceRaw,
    refetch: refetchAllowance,
    isFetching: allowanceLoading,
  } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && vaultAddress ? [address, vaultAddress] : undefined,
    query: {
      enabled: ready && !!address && !!usdcAddress && !!vaultAddress,
    },
  });

  const allowance = typeof allowanceRaw === "bigint" ? allowanceRaw : BigInt(0);

  const { data: balanceRaw } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: ready && !!address && !!usdcAddress,
    },
  });

  const balanceFormatted =
    balanceRaw !== undefined && balanceRaw !== null
      ? formatUnits(balanceRaw as bigint, decimals)
      : null;

  const needsApproval =
    ready && marginWei > BigInt(0) && (allowanceLoading ? true : allowance < marginWei);

  const wrongChain = isConnected && chainId !== arbitrumSepolia.id;

  const onConnect = () => {
    const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];
    if (!injected) {
      setStatusMessage("No wallet connector available.");
      return;
    }
    void connect({ connector: injected });
  };

  const onApprove = async () => {
    if (!ready || !usdcAddress || !vaultAddress || !address) return;
    setStatusMessage(null);
    try {
      if (wrongChain) {
        await switchChainAsync({ chainId: arbitrumSepolia.id });
      }
      const feeClient = publicClient ?? getPublicClient(config, { chainId: arbitrumSepolia.id });
      if (!feeClient) {
        setStatusMessage("Network client not ready — try again.");
        return;
      }
      const gas = await getEip1559GasForWrite(feeClient);
      const hash = await writeContractAsync({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultAddress, maxUint256],
        chainId: arbitrumSepolia.id,
        maxFeePerGas: gas.maxFeePerGas,
        maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
      });
      await waitForTransactionReceipt(config, { hash });
      await refetchAllowance();
      setStatusMessage("USDC approval confirmed.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed";
      setStatusMessage(msg);
    }
  };

  const onOpenPosition = async () => {
    if (!ready || !vaultAddress || !address || marginWei <= BigInt(0)) return;
    setStatusMessage(null);
    try {
      if (wrongChain) {
        await switchChainAsync({ chainId: arbitrumSepolia.id });
      }
      const feeClient = publicClient ?? getPublicClient(config, { chainId: arbitrumSepolia.id });
      if (!feeClient) {
        setStatusMessage("Network client not ready — try again.");
        return;
      }
      const gas = await getEip1559GasForWrite(feeClient);
      const market = symbolToContractMarket(selectedSymbol);
      const dir: 0 | 1 = side === "Long" ? 0 : 1;
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: prediPerpsVaultAbi,
        functionName: "openPosition",
        args: [market, marginWei, BigInt(leverage), dir],
        chainId: arbitrumSepolia.id,
        maxFeePerGas: gas.maxFeePerGas,
        maxPriorityFeePerGas: gas.maxPriorityFeePerGas,
      });
      await waitForTransactionReceipt(config, { hash });
      const row = buildPositionRow({
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `pos-${Date.now()}`,
        displaySymbol: selectedSymbol,
        side,
        margin: effectiveMargin,
        leverage,
        markPrice,
        txHash: hash,
      });
      onPositionOpened?.(row, address);
      setStatusMessage("Position opened on-chain.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setStatusMessage(msg);
    }
  };

  const busy = writePending || switchPending || connectPending;

  const primaryLabel = (() => {
    if (!isConnected) return "Connect wallet";
    if (wrongChain) return "Switch to Arbitrum Sepolia";
    if (!ready) return "Configure vault (env)";
    if (needsApproval) return "Approve USDC";
    return "Open position";
  })();

  const onPrimary = () => {
    if (!isConnected) {
      onConnect();
      return;
    }
    if (wrongChain) {
      void switchChainAsync({ chainId: arbitrumSepolia.id }).catch(() => {});
      return;
    }
    if (!ready) return;
    if (needsApproval) {
      void onApprove();
      return;
    }
    void onOpenPosition();
  };

  const fundsLine =
    balanceFormatted != null
      ? `${Number(balanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
      : "—";

  return (
    <aside className="w-full shrink-0 rounded-xl border border-white/10 bg-[#0a2245] p-4 lg:w-[320px]">
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-[#061a36] p-1 text-sm">
        {(["Long", "Short"] as const).map((item) => {
          const active = side === item;
          const isLong = item === "Long";
          return (
            <button
              key={item}
              type="button"
              onClick={() => setSide(item)}
              className={`rounded-md py-2.5 font-semibold transition ${
                active
                  ? isLong
                    ? "text-black"
                    : "bg-[#ef4a68] text-white"
                  : "bg-[#1a2f4d] text-white/70 hover:text-white"
              }`}
              style={
                active && isLong ? { backgroundColor: LONG_GREEN, color: "#0a0a0a" } : undefined
              }
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        {(["Market", "Limit"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setOrderType(item)}
            className={`rounded-md py-2 font-medium transition ${
              orderType === item
                ? "bg-[#2d5a9e] text-white"
                : "bg-[#1a2f4d] text-white/60 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-4 rounded-lg bg-[#061a36] p-3">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-white/45">
            <span>Margin</span>
            <span className="normal-case text-white/50">Balance: {fundsLine}</span>
          </div>
          <div className="flex rounded-md border border-white/10 bg-[#0b2246]">
            <input
              type="text"
              inputMode="decimal"
              value={marginInput}
              onChange={(e) => onMarginChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none"
            />
            <span className="flex items-center pr-3 text-sm text-white/50">USDC</span>
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-white/45">Size</div>
          <div className="flex rounded-md border border-white/10 bg-[#0b2246]">
            <input
              type="text"
              inputMode="decimal"
              value={sizeDisplayValue}
              onChange={(e) => onSizeFieldChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm tabular-nums text-white outline-none"
            />
            <div className="flex shrink-0 items-stretch border-l border-white/10">
              <button
                type="button"
                onClick={() => setSizeUnit((u) => (u === "usdc" ? "base" : "usdc"))}
                className="px-3 py-2 text-xs font-semibold tracking-wide text-[#8eb8ff] transition hover:bg-white/4 hover:text-[#b8d4ff]"
                title="Switch size unit"
              >
                {sizeUnit === "usdc" ? "USDC" : baseAsset}
              </button>
              <div className="flex w-7 flex-col border-l border-white/10">
                <button
                  type="button"
                  aria-label="Increase size"
                  onClick={() => onSizeStep(1)}
                  className="flex flex-1 items-center justify-center border-b border-white/10 py-0.5 text-white/40 transition hover:bg-white/4 hover:text-white/70"
                >
                  <SizeChevron direction="up" />
                </button>
                <button
                  type="button"
                  aria-label="Decrease size"
                  onClick={() => onSizeStep(-1)}
                  className="flex flex-1 items-center justify-center py-0.5 text-white/40 transition hover:bg-white/4 hover:text-white/70"
                >
                  <SizeChevron direction="down" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex justify-between text-[10px] text-white/45">
            {leverageMarks.map((m) => (
              <span key={m}>{m}x</span>
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="leverage-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-[#1e3355]"
            style={{
              accentColor: side === "Long" ? LONG_GREEN : "#ef4a68",
            }}
          />
        </div>

        <button
          type="button"
          onClick={onPrimary}
          disabled={
            busy ||
            primaryLabel === "Configure vault (env)" ||
            ((primaryLabel === "Approve USDC" || primaryLabel === "Open position") &&
              effectiveMargin <= 0)
          }
          className={`w-full rounded-lg py-3 text-sm font-bold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 ${
            side === "Long" ? "text-black" : "text-white"
          }`}
          style={{ backgroundColor: side === "Long" ? LONG_GREEN : "#ef4a68" }}
        >
          {busy ? "Confirm in wallet…" : primaryLabel}
        </button>

        {statusMessage ? (
          <p className="text-center text-[11px] text-[#9aa8bc]">{statusMessage}</p>
        ) : null}

        <div className="rounded-lg border border-white/10 bg-[#071a33]">
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-white/90"
          >
            Details
            <span className="text-[#6ea8ff]">{detailsOpen ? "⌃" : "⌄"}</span>
          </button>
          {detailsOpen ? (
            <div className="space-y-2 border-t border-white/10 px-3 py-3 text-xs">
              <DetailRow label="Price" value={`${markPrice.toFixed(4)} USDC`} />
              <DetailRow label="Margin" value={`${effectiveMargin.toFixed(2)} USDC`} />
              <DetailRow label="Additional required margin" value="0.00 USDC" />
              <DetailRow label="Notional value" value={`${notionalValue.toFixed(2)} USDC`} />
              <DetailRow
                label="Estimated notional amount"
                value={`${positionAsset.toFixed(2)} ${baseAsset}`}
              />
              <DetailRow
                label="Estimated liquidation price"
                value={`${estLiqPrice.toFixed(2)} USDC`}
              />
              <DetailRow label="Fees" value={`${fees.toFixed(4)} USDC`} />
              <div className="flex items-center justify-between gap-2 text-white/55">
                <span>Slippage</span>
                <span className="flex items-center gap-1 text-white">
                  2% <span className="cursor-pointer text-[#6ea8ff]">✎</span>
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-[#061a36] p-3 text-xs">
        <div className="text-white/45">Current position</div>
        <div className="mt-1 text-white">0.00 {baseAsset}</div>
        <div className="mt-3 flex items-center gap-1.5 text-white/45">
          <span aria-hidden>◱</span>
          Funds available
        </div>
        <div className="mt-1 text-base font-medium text-white">{fundsLine}</div>
      </div>

      <style jsx>{`
        .leverage-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid ${side === "Long" ? LONG_GREEN : "#ef4a68"};
          margin-top: -5px;
          cursor: pointer;
        }
        .leverage-slider::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            ${side === "Long" ? LONG_GREEN : "#ef4a68"} 0%,
            ${side === "Long" ? LONG_GREEN : "#ef4a68"} ${((leverage - 1) / 19) * 100}%,
            #1e3355 ${((leverage - 1) / 19) * 100}%,
            #1e3355 100%
          );
        }
        .leverage-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid ${side === "Long" ? LONG_GREEN : "#ef4a68"};
          cursor: pointer;
        }
        .leverage-slider::-moz-range-track {
          height: 8px;
          border-radius: 9999px;
          background: #1e3355;
        }
        .leverage-slider::-moz-range-progress {
          height: 8px;
          border-radius: 9999px;
          background: ${side === "Long" ? LONG_GREEN : "#ef4a68"};
        }
      `}</style>
    </aside>
  );
}

function SizeChevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden
    >
      {direction === "up" ? (
        <path
          d="M1 5L5 1L9 5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M1 1L5 5L9 1"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-white/55">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}
