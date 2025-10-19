---
title: First Project
description: Create your first Solana project with SolForge
---

# Your First Project with SolForge

This guide walks you through creating a complete Solana project using SolForge, from initialization to deployment and testing.

## Project Setup

### 1. Create Project Directory

```bash
mkdir my-solana-app
cd my-solana-app
```

### 2. Start SolForge

```bash
solforge
```

This will run interactive setup and start all services. It creates `sf.config.json` with sensible defaults:

```json
{
  "name": "my-solana-app",
  "server": {
    "rpcPort": 8899,
    "wsPort": 8900,
    "db": {
      "mode": "memory",
      "path": ".solforge/ledger"
    }
  },
  "gui": {
    "enabled": true,
    "port": 42069
  },
  "clone": {
    "endpoint": "https://api.mainnet-beta.solana.com",
    "programs": [],
    "tokens": []
  },
  "bootstrap": {
    "airdrops": []
  }
}
```

This launches:
- RPC Server: `http://127.0.0.1:8899`
### 2. Start SolForge
solforge
This will run interactive setup and start all services. It creates `sf.config.json` with sensible defaults:
- WebSocket: `ws://127.0.0.1:8900`
- Web Dashboard: `http://127.0.0.1:42069`

## Building with Anchor

### Initialize Anchor Project

```bash
anchor init my-program
cd my-program
```

### Configure Anchor for SolForge

Edit `Anchor.toml`:

```toml
[provider]
cluster = "http://127.0.0.1:8899"
wallet = "~/.config/solana/id.json"

[programs.localnet]
my_program = "YourProgramID"

[scripts]
test = "bun run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Write Your Program

Create a simple counter program in `programs/my-program/src/lib.rs`:

```rust
use anchor_lang::prelude::*;

declare_id!("YourProgramID");

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

#[account]
pub struct Counter {
    pub count: u64,
}
```

### Build and Deploy

```bash
# Build
anchor build

# Deploy to SolForge localnet
anchor deploy
```

### Write Tests

Create `tests/my-program.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyProgram } from "../target/types/my_program";
import { expect } from "chai";

describe("my-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MyProgram as Program<MyProgram>;

  it("Initializes the counter", async () => {
    const counter = anchor.web3.Keypair.generate();
    
    await program.methods
      .initialize()
      .accounts({
        counter: counter.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([counter])
      .rpc();

    const account = await program.account.counter.fetch(counter.publicKey);
    expect(account.count.toNumber()).to.equal(0);
  });

  it("Increments the counter", async () => {
    const counter = anchor.web3.Keypair.generate();
    
    await program.methods.initialize()
      .accounts({
        counter: counter.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([counter])
      .rpc();

    await program.methods.increment()
      .accounts({
        counter: counter.publicKey,
      })
      .rpc();

    const account = await program.account.counter.fetch(counter.publicKey);
    expect(account.count.toNumber()).to.equal(1);
  });
});
```

### Run Tests

```bash
anchor test --skip-local-validator
```

SolForge is already running, so we skip Anchor's built-in validator.

## Building with web3.js (No Anchor)

### Initialize TypeScript Project

```bash
mkdir my-web3-app
cd my-web3-app
bun init -y
```

### Install Dependencies

```bash
bun add @solana/web3.js
bun add -d @types/node
```

### Create a Simple Transfer Script

Create `src/transfer.ts`:

```typescript
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

async function main() {
  // Connect to SolForge
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  // Generate or load keypairs
  const payer = Keypair.generate();
  const recipient = Keypair.generate();

  console.log("Payer:", payer.publicKey.toString());
  console.log("Recipient:", recipient.publicKey.toString());

  // Request airdrop for payer
  console.log("\nRequesting airdrop...");
  const airdropSig = await connection.requestAirdrop(
    payer.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSig);

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Payer balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  // Create transfer transaction
  console.log("\nTransferring 1 SOL...");
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipient.publicKey,
      lamports: LAMPORTS_PER_SOL,
    })
  );

  // Send and confirm
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    payer,
  ]);
  console.log("Transaction signature:", signature);

  // Check final balances
  const payerBalance = await connection.getBalance(payer.publicKey);
  const recipientBalance = await connection.getBalance(recipient.publicKey);
  
  console.log(`\nFinal balances:`);
  console.log(`Payer: ${payerBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Recipient: ${recipientBalance / LAMPORTS_PER_SOL} SOL`);
}

main().catch(console.error);
```

### Run It

```bash
bun src/transfer.ts
```

## Working with Tokens

### Clone USDC from Mainnet

```bash
solforge token clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

This clones the USDC mint and makes it available on your localnet.

### Create Your Own Token

```bash
solforge token create --decimals 9 --owner <YOUR_PUBKEY>
```

### Mint Tokens

```bash
# Interactive
solforge mint

# Or with flags
solforge mint --mint <MINT_ADDRESS> --to <RECIPIENT> --ui-amount 1000
```

## Working with Programs

### Clone a Program from Mainnet

```bash
# Clone just the program code
solforge program clone TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

# Clone program with its accounts
solforge program clone <PROGRAM_ID> --with-accounts --accounts-limit 100
```

### Load Your Own Program

```bash
solforge program load --file ./target/deploy/my_program.so
```

## Bootstrap Configuration

For repeated development, add automatic setup to `sf.config.json`:

```json
{
  "clone": {
    "programs": [
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    ],
    "tokens": [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    ]
  },
  "bootstrap": {
    "airdrops": [
      {
        "address": "YOUR_WALLET_ADDRESS",
        "amountSol": 100
      }
    ]
  }
}
```

Now every time you run `solforge`, it will:
1. Clone specified programs and tokens
2. Airdrop SOL to your wallet
3. Be ready to use immediately

## Using the Web Dashboard

Open `http://127.0.0.1:42069` to access:

### Airdrop Interface
- Visual SOL distribution to any wallet
- No rate limits, instant execution

### Token Management
- Create new tokens with metadata
- Clone tokens from mainnet
- Mint to any account

### Transaction Explorer
- View all transactions
- Inspect transaction details
- Debug failed transactions

### Real-time Monitoring
- Current slot and block height
- Network statistics
- Active accounts

## Next Steps

- [Enable AI Assistant](/ai/quickstart) - Get coding help from Claude/GPT-4
- [Configuration Reference](/config/reference) - Customize your setup
- [CLI Commands](/cli/overview) - Learn all available commands
- [Framework Integration](/frameworks/anchor) - Deep dive into Anchor/web3.js

## Common Patterns

### Testing Pattern

```bash
# Terminal 1: Keep SolForge running
solforge

# Terminal 2: Run tests
anchor test --skip-local-validator
# or
bun test
```

### Development Cycle

1. Write/modify program code
2. `anchor build`
3. `anchor deploy`
4. Run tests or manual testing
5. Repeat

### Debugging

1. Check Web Dashboard for transaction details
2. Use AI Assistant to analyze errors
3. View RPC logs with `DEBUG_RPC_LOG=1 solforge`

## Troubleshooting

### Program Deployment Fails

```bash
# Ensure you have enough SOL
solana balance

# Request more if needed
solana airdrop 100
```

### Tests Timeout

Increase test timeout in your test runner. SolForge is fast, but network delays can happen.

### Port Conflicts

```bash
# Change ports in sf.config.json
{
  "server": {
    "rpcPort": 9999,
    "wsPort": 10000
  }
}
```

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
