![PrediPerps](public/prediperps-logo.svg)

A **Next.js** trading interface for perpetual-style markets: live candle charts, order sizing (margin, leverage, long/short), and a **“what-if” hybrid market** that combines an underlying perp reference with **Polymarket-style** prediction data when you select markets like `BTC-USD-WHAT-IF`.

The app is built for **hackathon / demo** workflows: mock price streams, optional REST snapshots for the hybrid market, and **on-chain** USDC flows against a minimal **vault contract** (approve → `openPosition`) while **open positions** are persisted in the browser **`localStorage`** per connected wallet.

**Stack highlights:** React 19, Next.js App Router (`/market/[slug]` URLs), Tailwind, **Privy** + **wagmi/viem** (Arbitrum Sepolia), **lightweight-charts**, local JSON fixtures when APIs are unset.

---

## Overview

- **Markets & routing** — Each tradable symbol has a URL such as `/market/btc-usd` or `/market/btc-usd-what-if`. The home route `/` redirects to `/market/btc-usd`.
- **Charts** — Main chart scales mock candles to the selected market; the what-if market can use API `hybrid_price` / `hybrid_candles` or client-side synthetic hybrid history.
- **Hybrid section** — Prediction (Polymarket) copy and underlying perp snapshot; mini perp chart when API omits perp candles (falls back to the global mock stream, scaled to perp price).
- **Trading** — Order panel estimates notional, fees, and liq. price; with env configured, users **approve USDC** then call **`openPosition(market, margin, leverage, direction)`** on the deployed vault (USDC margin pulled via `transferFrom`).
- **Positions table** — Rows are stored under `predi-perps-positions:<lowercase_wallet_address>`; not written to a backend in this repo.

---

## Local development

Prerequisites: **Node** 20+ or **Bun** (this repo uses Bun in examples).

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/market/btc-usd`).

```bash
bun run lint
bun run build
```

---

## Setup

### 1. Environment variables

Copy the example file and edit values:

```bash
cp .env.local.example .env.local
```

| Variable                               | Purpose                                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_PRIVY_APP_ID`             | Privy app ID for wallet / email login. Leave unset only if you rely on injected wallet without Privy UI. **Do not** expose `PRIVY_APP_SECRET` as `NEXT_PUBLIC_*` — keep secrets server-only. |
| `NEXT_PUBLIC_RPC_URL`                  | Optional HTTP RPC for Arbitrum Sepolia (e.g. Alchemy/Infura). Falls back to the public RPC if omitted.                                                                                       |
| `NEXT_PUBLIC_USDC_ADDRESS`             | USDC token on **Arbitrum Sepolia** (same chain as the vault).                                                                                                                                |
| `NEXT_PUBLIC_PREDI_VAULT_ADDRESS`      | Deployed `PrediPerpsVault` contract (see below).                                                                                                                                             |
| `NEXT_PUBLIC_WHAT_IF_MARKET_API_URL`   | Optional. If empty, the UI loads `src/lib/api/fixtures/whatIfMarket.mock.json`.                                                                                                              |
| `NEXT_PUBLIC_WHAT_IF_POLL_INTERVAL_MS` | Polling interval for the what-if API when a what-if market is selected (default sensible in example).                                                                                        |

`NEXT_PUBLIC_*` variables are inlined into the client bundle; restart the dev server after changing `.env.local`.

### 2. Deploy the vault contract

The Solidity contract lives under `contracts/` (`PrediPerpsVault.sol`). It accepts a **USDC token address** in the constructor and exposes `openPosition(string market, uint256 margin, uint256 leverage, uint8 direction)` where `direction` is `0` = long, `1` = short; margin is in **USDC’s smallest units** (typically 6 decimals).

**Build & deploy (Foundry):**

```bash
cd contracts
forge build
```

Deploy to **Arbitrum Sepolia** (set `USDC_ADDRESS` to that network’s USDC):

```bash
forge create src/PrediPerpsVault.sol:PrediPerpsVault \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --constructor-args "$USDC_ADDRESS"
```

Put the deployed vault address and the same USDC address into `.env.local` as `NEXT_PUBLIC_PREDI_VAULT_ADDRESS` and `NEXT_PUBLIC_USDC_ADDRESS`.

More detail: [`contracts/README.md`](contracts/README.md).

### 3. Clearing open positions (localStorage)

Positions are stored in the browser only, keyed by wallet:

`predi-perps-positions:<lowercase_wallet_address>`

**Remove one wallet’s rows** — DevTools → **Console**:

```js
localStorage.removeItem("predi-perps-positions:0x_your_address_lowercase");
```

**Remove all Predi position keys** (other `localStorage` keys on the same origin are kept):

```js
Object.keys(localStorage)
  .filter((k) => k.startsWith("predi-perps-positions:"))
  .forEach((k) => localStorage.removeItem(k));
```

**Clear everything** for this origin:

```js
localStorage.clear();
```

Or use DevTools → **Application** → **Local Storage** → your origin → delete entries or **Clear**.

---

## Deploying the web app

The UI is a standard Next.js app; deploy to Vercel, Cloudflare Pages, or any Node host. Set the same `NEXT_PUBLIC_*` env vars in the host’s dashboard. Ensure the vault and USDC addresses match the chain users will use (Arbitrum Sepolia in the current config).

---

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Privy](https://docs.privy.io) · [wagmi](https://wagmi.sh) · [viem](https://viem.sh)
