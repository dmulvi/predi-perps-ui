# PrediPerpsVault

Minimal Solidity vault used by the UI: `openPosition` pulls **margin** amount of **USDC** from the user (requires prior `approve` on the USDC token for this contract).

## Build (Foundry)

```bash
cd contracts
forge build
```

## Deploy (example — Arbitrum Sepolia)

Set `USDC` to your chain’s USDC token, then:

```bash
forge create src/PrediPerpsVault.sol:PrediPerpsVault \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --constructor-args "$USDC_ADDRESS"
```

Copy the deployed address into `NEXT_PUBLIC_PREDI_VAULT_ADDRESS` and the USDC address into `NEXT_PUBLIC_USDC_ADDRESS`.
