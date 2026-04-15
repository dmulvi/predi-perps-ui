import type { PublicClient } from "viem";

/**
 * Fee params for `writeContract` when estimates are too tight vs the current
 * block base fee (fixes "max fee per gas less than block base fee" on L2).
 */
export async function getEip1559GasForWrite(client: PublicClient): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}> {
  const [block, estimate] = await Promise.all([
    client.getBlock({ blockTag: "latest" }),
    client.estimateFeesPerGas().catch(() => null),
  ]);

  const zero = BigInt(0);
  const baseFee = block.baseFeePerGas ?? zero;

  let maxPriorityFeePerGas = estimate?.maxPriorityFeePerGas
    ? (estimate.maxPriorityFeePerGas * BigInt(3)) / BigInt(2)
    : baseFee > zero
      ? (baseFee * BigInt(10)) / BigInt(100)
      : BigInt(100_000);
  if (maxPriorityFeePerGas < BigInt(1)) {
    maxPriorityFeePerGas = BigInt(1);
  }

  // EIP-1559: need maxFeePerGas >= base fee + effective priority; add ~35% base headroom.
  let maxFeePerGas = estimate?.maxFeePerGas
    ? (estimate.maxFeePerGas * BigInt(3)) / BigInt(2)
    : baseFee * BigInt(2) + maxPriorityFeePerGas;

  const minMax =
    baseFee > zero
      ? baseFee + maxPriorityFeePerGas + (baseFee * BigInt(35)) / BigInt(100)
      : maxFeePerGas;
  if (maxFeePerGas < minMax) {
    maxFeePerGas = minMax;
  }

  return { maxFeePerGas, maxPriorityFeePerGas };
}
