import type { Position } from "@/lib/mock/market";

const PREFIX = "predi-perps-positions:";

export function positionsStorageKey(address: string) {
  return `${PREFIX}${address.toLowerCase()}`;
}

export function loadStoredPositions(walletAddress: string): Position[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(positionsStorageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is Position => {
      return (
        typeof row === "object" &&
        row !== null &&
        typeof (row as Position).id === "string" &&
        typeof (row as Position).market === "string"
      );
    });
  } catch {
    return [];
  }
}

export function saveStoredPositions(walletAddress: string, positions: Position[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(positionsStorageKey(walletAddress), JSON.stringify(positions));
  } catch {
    /* quota or private mode */
  }
}

export function prependPosition(walletAddress: string, position: Position) {
  const prev = loadStoredPositions(walletAddress);
  saveStoredPositions(walletAddress, [position, ...prev]);
}
