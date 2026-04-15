import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export const prediPerpsVaultAbi = parseAbi([
  "function openPosition(string market, uint256 margin, uint256 leverage, uint8 direction) external",
  "function usdc() view returns (address)",
  "event PositionOpened(address indexed user, string market, uint256 margin, uint256 leverage, uint8 direction)",
]);
