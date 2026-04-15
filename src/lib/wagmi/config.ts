import { createConfig as createPrivyWagmiConfig } from "@privy-io/wagmi";
import { createConfig } from "wagmi";
import { http } from "wagmi";
import { injected } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";

const transports = {
  [arbitrumSepolia.id]: http(
    process.env.NEXT_PUBLIC_RPC_URL?.trim() || undefined
  ),
} as const;

/** With `PrivyProvider` — Privy syncs embedded / linked wallets into wagmi. */
export const wagmiConfig = createPrivyWagmiConfig({
  chains: [arbitrumSepolia],
  transports,
});

/** Without Privy — standard injected wallet (MetaMask, etc.). */
export const wagmiConfigInjected = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
