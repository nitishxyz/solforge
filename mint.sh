#!/usr/bin/env bash

set -euo pipefail

# Usage: ./mint.sh [AMOUNT]
# - AMOUNT defaults to 1000 (base units; SPL default decimals is 9)

amount="${1:-1000}"

if ! command -v spl-token >/dev/null 2>&1; then
  echo "Error: spl-token CLI not found. Install Solana CLI tools." >&2
  exit 1
fi

echo "Creating new SPL token..."
create_out=$(spl-token create-token)
echo "$create_out"

mint_address=$(printf '%s\n' "$create_out" | awk '/Creating token/ {print $3; exit}')

if [[ -z "${mint_address:-}" ]]; then
  echo "Error: Failed to parse token mint address." >&2
  exit 1
fi

echo
echo "Creating associated token account for mint $mint_address ..."
acct_out=$(spl-token create-account "$mint_address")
echo "$acct_out"

acct_address=$(printf '%s\n' "$acct_out" | awk '/Creating account/ {print $3; exit}')

echo
echo "Minting $amount tokens to your associated account..."
mint_out=$(spl-token mint "$mint_address" "$amount")
echo "$mint_out"

echo
echo "Done. Summary:"
echo "- Token Mint Address: $mint_address"
if [[ -n "${acct_address:-}" ]]; then
  echo "- Associated Token Account: $acct_address"
fi
echo "- Minted Amount: $amount"
echo
echo "Tip: Save the mint address above; it represents your token mint."

