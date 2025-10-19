---
title: solforge mint
description: Mint SPL tokens on your local network
---

# solforge mint

Mint SPL tokens to any account on your localnet.

## Usage

```bash
# Interactive
solforge mint

# With flags
solforge mint --mint <MINT> --to <RECIPIENT> --ui-amount <AMOUNT>
```

## Interactive Mode

Running `solforge mint` without flags enters interactive mode:

```bash
$ solforge mint
? Select mint: (shows list of known mints)
? Receiver public key: <enter address>
? Amount (UI units): 1000
✓ Minted
```

## Options

- `--mint <address>`: Mint address
- `--to <address>`: Recipient address (token account owner)
- `--ui-amount <number>`: Amount in UI units (e.g., 1000.5)
- `--amount <base-units>`: Amount in base units (rarely used)

## Examples

```bash
# Interactive - pick from known mints
solforge mint

# Mint USDC to wallet
solforge mint \
  --mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --to YourWallet... \
  --ui-amount 10000

# Mint custom token
solforge mint --mint <YOUR_MINT> --to <ADDR> --ui-amount 1000000
```

## How It Works

SolForge mints tokens using real SPL Token transactions:

1. Queries mint decimals from localnet
2. Creates/updates Associated Token Account (ATA)
3. Calls `MintTo` instruction
4. Returns transaction signature

## Authority Management

If the faucet is not the mint authority, you'll be prompted:

```
? Mint authority is not faucet. Choose action:
  > Adopt faucet as authority (local) and mint (real tx)
    Admin set-balance (no real tx)
    Cancel
```

- **Adopt**: Changes mint authority to faucet (local only), then mints
- **Admin**: Directly sets balance without transaction (for testing)

## Related

- [Token Management](/core/token-management)
- [solforge token](/cli/token)
