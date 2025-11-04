#!/bin/bash

set -e

WALLET_ADDRESS="HiZJzJdU8XhfWYEzYWBJ7GCPGViNYTZetDHM7D6SNQFw"
USDC_MINT="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

echo "🔧 Setting up Devnet Wallet for x402 Testing"
echo "=============================================="
echo ""

echo "📍 Wallet: $WALLET_ADDRESS"
echo "🪙  USDC Mint: $USDC_MINT"
echo ""

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check if SPL Token CLI is installed
if ! command -v spl-token &> /dev/null; then
    echo "❌ SPL Token CLI not found. Install with: cargo install spl-token-cli"
    exit 1
fi

echo "✅ Solana CLI found"
echo "✅ SPL Token CLI found"
echo ""

# Set to devnet
echo "🌐 Setting network to devnet..."
solana config set --url devnet
echo ""

# Check SOL balance
echo "💰 Checking SOL balance..."
SOL_BALANCE=$(solana balance $WALLET_ADDRESS | awk '{print $1}')
echo "   Current balance: $SOL_BALANCE SOL"
echo ""

if (( $(echo "$SOL_BALANCE < 1" | bc -l) )); then
    echo "📥 Airdropping 2 SOL..."
    solana airdrop 2 $WALLET_ADDRESS
    echo "   ✅ Airdrop complete"
else
    echo "   ✅ Sufficient SOL balance"
fi
echo ""

# Check if USDC ATA exists
echo "🔍 Checking for USDC Associated Token Account..."
if spl-token accounts --owner $WALLET_ADDRESS | grep -q $USDC_MINT; then
    echo "   ✅ USDC ATA already exists"
    
    # Show USDC balance
    USDC_BALANCE=$(spl-token balance $USDC_MINT --owner $WALLET_ADDRESS)
    echo "   💵 USDC Balance: $USDC_BALANCE"
else
    echo "   ⚠️  USDC ATA not found, creating..."
    spl-token create-account $USDC_MINT --owner $WALLET_ADDRESS
    echo "   ✅ USDC ATA created"
fi
echo ""

echo "📝 Next Steps:"
echo "=============="
echo ""
echo "1. Get devnet USDC from a faucet:"
echo "   • Circle Faucet: https://faucet.circle.com/"
echo "   • Or use: https://spl-token-faucet.com/"
echo ""
echo "2. Verify USDC balance:"
echo "   spl-token balance $USDC_MINT --owner $WALLET_ADDRESS"
echo ""
echo "3. Run tests:"
echo "   cd apps/ai"
echo "   bun run test/x402-client-test.ts"
echo ""
echo "✅ Setup complete!"
