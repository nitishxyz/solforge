# Configuration Guide

This guide covers all configuration options available in SolForge's `sf.config.json` file.

## Configuration File Structure

```json
{
  "name": "string",
  "description": "string (optional)",
  "tokens": [
    /* TokenConfig[] */
  ],
  "programs": [
    /* ProgramConfig[] */
  ],
  "localnet": {
    /* LocalnetConfig */
  }
}
```

## Root Configuration

### `name` (required)

- **Type**: `string`
- **Default**: `"solforge-localnet"`
- **Description**: Name identifier for your localnet configuration

### `description` (optional)

- **Type**: `string`
- **Description**: Human-readable description of your setup

### `tokens` (optional)

- **Type**: `TokenConfig[]`
- **Default**: `[]`
- **Description**: Array of tokens to clone from mainnet

### `programs` (optional)

- **Type**: `ProgramConfig[]`
- **Default**: `[]`
- **Description**: Array of programs to clone from mainnet

### `localnet` (optional)

- **Type**: `LocalnetConfig`
- **Description**: Validator configuration options

## Token Configuration (`TokenConfig`)

### `symbol` (required)

- **Type**: `string`
- **Description**: Token symbol (e.g., "USDC", "SOL")
- **Example**: `"USDC"`

### `mainnetMint` (required)

- **Type**: `string`
- **Description**: Mainnet mint address to clone
- **Example**: `"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"`

### `mintAuthority` (optional)

- **Type**: `string`
- **Description**: Path to keypair file for mint authority
- **Example**: `"./keypairs/mint-authority.json"`
- **Note**: If not provided, a new keypair will be generated

### `mintAmount` (optional)

- **Type**: `number`
- **Default**: `1000000`
- **Description**: Amount to mint to the mint authority
- **Note**: Amount is in token's base units (considering decimals)

### `cloneMetadata` (optional)

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to clone token metadata from mainnet

### `recipients` (optional)

- **Type**: `RecipientConfig[]`
- **Default**: `[]`
- **Description**: List of wallets to receive tokens after minting

#### `RecipientConfig`

```json
{
  "wallet": "string (required)",
  "amount": "number (required)"
}
```

- `wallet`: Public key of recipient wallet
- `amount`: Amount to transfer (in token's base units)

### Example Token Configuration

```json
{
  "symbol": "USDC",
  "mainnetMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "mintAuthority": "./keypairs/usdc-mint.json",
  "mintAmount": 10000000000,
  "cloneMetadata": true,
  "recipients": [
    {
      "wallet": "YourWalletPublicKeyHere",
      "amount": 1000000000
    },
    {
      "wallet": "AnotherWalletPublicKeyHere",
      "amount": 500000000
    }
  ]
}
```

## Program Configuration (`ProgramConfig`)

### `name` (optional)

- **Type**: `string`
- **Description**: Friendly name for the program
- **Example**: `"Jupiter Aggregator"`

### `mainnetProgramId` (required)

- **Type**: `string`
- **Description**: Mainnet program ID to clone
- **Example**: `"JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"`

### `deployPath` (optional)

- **Type**: `string`
- **Description**: Path to local .so file to deploy instead of cloning
- **Example**: `"./target/deploy/my_program.so"`

### `upgradeable` (optional)

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Whether the program should be deployed as upgradeable

### `cluster` (optional)

- **Type**: `"mainnet-beta" | "devnet" | "testnet"`
- **Default**: `"mainnet-beta"`
- **Description**: Source cluster to clone the program from

### `dependencies` (optional)

- **Type**: `string[]`
- **Default**: `[]`
- **Description**: Array of program IDs this program depends on
- **Note**: Dependencies will be deployed before this program

### Example Program Configuration

```json
{
  "name": "Jupiter Aggregator",
  "mainnetProgramId": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  "cluster": "mainnet-beta",
  "upgradeable": false,
  "dependencies": ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"]
}
```

## Localnet Configuration (`LocalnetConfig`)

### `airdropAmount` (optional)

- **Type**: `number`
- **Default**: `100`
- **Description**: SOL amount for initial airdrops
- **Unit**: SOL

### `faucetAccounts` (optional)

- **Type**: `string[]`
- **Default**: `[]`
- **Description**: Public keys to receive initial SOL airdrops

### `port` (optional)

- **Type**: `number`
- **Default**: `8899`
- **Range**: `1000-65535`
- **Description**: RPC port for the validator

### `faucetPort` (optional)

- **Type**: `number`
- **Default**: `9900`
- **Range**: `1000-65535`
- **Description**: Faucet port for the validator

### `reset` (optional)

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Whether to reset the ledger on startup

### `logLevel` (optional)

- **Type**: `"trace" | "debug" | "info" | "warn" | "error"`
- **Default**: `"info"`
- **Description**: Validator log level

### `quiet` (optional)

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Suppress validator output

### `ledgerPath` (optional)

- **Type**: `string`
- **Description**: Custom path for ledger data
- **Note**: If not specified, uses default location

### `bindAddress` (optional)

- **Type**: `string`
- **Default**: `"127.0.0.1"`
- **Description**: IP address to bind the validator to

### `limitLedgerSize` (optional)

- **Type**: `number`
- **Default**: `100000`
- **Description**: Maximum ledger size in slots

### `rpc` (optional)

- **Type**: `string` (URL)
- **Default**: `"https://api.mainnet-beta.solana.com"`
- **Description**: RPC URL for cloning data from mainnet

### Example Localnet Configuration

```json
{
  "airdropAmount": 1000,
  "faucetAccounts": ["YourWalletPublicKeyHere", "AnotherWalletPublicKeyHere"],
  "port": 8899,
  "faucetPort": 9900,
  "reset": false,
  "logLevel": "debug",
  "quiet": false,
  "bindAddress": "0.0.0.0",
  "limitLedgerSize": 50000,
  "rpc": "https://mainnet.helius-rpc.com/?api-key=your-key"
}
```

## Complete Example Configuration

```json
{
  "name": "defi-development",
  "description": "DeFi development environment with popular tokens and DEX programs",
  "tokens": [
    {
      "symbol": "USDC",
      "mainnetMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "mintAmount": 10000000000,
      "cloneMetadata": true,
      "recipients": [
        {
          "wallet": "YourWalletPublicKeyHere",
          "amount": 1000000000
        }
      ]
    },
    {
      "symbol": "USDT",
      "mainnetMint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      "mintAmount": 10000000000,
      "cloneMetadata": true,
      "recipients": [
        {
          "wallet": "YourWalletPublicKeyHere",
          "amount": 1000000000
        }
      ]
    }
  ],
  "programs": [
    {
      "name": "Jupiter Aggregator",
      "mainnetProgramId": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
      "cluster": "mainnet-beta"
    },
    {
      "name": "Orca",
      "mainnetProgramId": "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP",
      "cluster": "mainnet-beta"
    },
    {
      "name": "Token Metadata",
      "mainnetProgramId": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
      "cluster": "mainnet-beta"
    }
  ],
  "localnet": {
    "airdropAmount": 1000,
    "faucetAccounts": ["YourWalletPublicKeyHere"],
    "port": 8899,
    "faucetPort": 9900,
    "reset": false,
    "logLevel": "info",
    "bindAddress": "127.0.0.1",
    "limitLedgerSize": 100000,
    "rpc": "https://api.mainnet-beta.solana.com"
  }
}
```

## Configuration Validation

SolForge validates your configuration file using Zod schemas. Common validation errors:

### Invalid Token Configuration

```
❌ Token symbol is required
❌ Mainnet mint address is required
❌ Mint amount must be positive
❌ Wallet address is required for recipients
```

### Invalid Program Configuration

```
❌ Program ID is required
❌ Invalid cluster (must be mainnet-beta, devnet, or testnet)
```

### Invalid Localnet Configuration

```
❌ Port must be between 1000 and 65535
❌ RPC must be a valid URL
❌ Log level must be one of: trace, debug, info, warn, error
```

## Best Practices

1. **Use descriptive names**: Make your configuration name and description clear
2. **Start small**: Begin with a few tokens/programs and add more as needed
3. **Use custom RPC**: Consider using a dedicated RPC endpoint for better performance
4. **Manage keypairs**: Store mint authority keypairs securely
5. **Port management**: Use different ports for multiple environments
6. **Reset wisely**: Use `reset: true` for clean starts, `false` for persistent data
7. **Log levels**: Use `debug` for development, `info` for production

## Environment-Specific Configurations

### Development Environment

```json
{
  "name": "dev-environment",
  "localnet": {
    "reset": true,
    "logLevel": "debug",
    "airdropAmount": 1000
  }
}
```

### Testing Environment

```json
{
  "name": "test-environment",
  "localnet": {
    "reset": false,
    "logLevel": "warn",
    "quiet": true
  }
}
```

### Production-like Environment

```json
{
  "name": "prod-like-environment",
  "localnet": {
    "reset": false,
    "logLevel": "error",
    "limitLedgerSize": 1000000,
    "rpc": "https://your-premium-rpc-endpoint.com"
  }
}
```
