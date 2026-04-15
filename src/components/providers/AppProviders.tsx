"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { type ReactNode, useState } from "react";
import { WagmiProvider as WagmiProviderBase } from "wagmi";
import { WagmiProvider } from "@privy-io/wagmi";

import { wagmiConfig, wagmiConfigInjected } from "@/lib/wagmi/config";

type Props = {
  children: ReactNode;
};

export function AppProviders({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient());
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

  if (appId) {
    return (
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["wallet", "email"],
          appearance: {
            theme: "dark",
            accentColor: "#fb3d72",
            walletChainType: "ethereum-only",
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProviderBase config={wagmiConfigInjected}>{children}</WagmiProviderBase>
    </QueryClientProvider>
  );
}
