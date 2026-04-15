import { isAddress } from "viem";

/**
 * Parse an Ethereum address from env. Must use **static** `process.env.NEXT_PUBLIC_*`
 * access so Next.js can inline values into the client bundle — dynamic
 * `process.env[name]` does not work in the browser.
 */
function parseEnvAddress(raw: string | undefined): `0x${string}` | undefined {
  if (raw == null) return undefined;
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (!cleaned || !isAddress(cleaned)) return undefined;
  return cleaned as `0x${string}`;
}

/** Static reads — required for Next.js client bundle inlining. */
export const vaultAddress = parseEnvAddress(
  process.env.NEXT_PUBLIC_PREDI_VAULT_ADDRESS
);

export const usdcAddress = parseEnvAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS
);

export function contractsConfigured(): boolean {
  return vaultAddress != null && usdcAddress != null;
}
