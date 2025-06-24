# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.6] - 2025-01-27

### Added

- **Network Access Flag**: Added `--network` flag to `solforge start` command
  - Makes API server accessible over network by binding to `0.0.0.0` instead of `127.0.0.1`
  - Displays helpful network mode indicator when enabled
  - Maintains localhost-only access by default for security
- **Standalone API Server Command**: New `solforge api-server` command
  - Run API server independently without starting a validator
  - Configurable port, host, RPC URL, faucet URL, and work directory
  - Useful for connecting to existing validators or remote setups
- **Enhanced Documentation**:
  - Added comprehensive npm installation instructions
  - Added npm version badge and license badge to README
  - Updated all API examples to reflect new mint endpoint format
  - Added network access documentation throughout

### Changed

- **BREAKING: Mint API Endpoint**: Changed from `/api/tokens/:symbol/mint` to `/api/tokens/:mintAddress/mint`
  - Now uses mint address instead of token symbol for more precise token identification
  - Updated all documentation and examples to reflect this change
  - More reliable as mint addresses are unique while symbols can be duplicated
- **API Server Host Configuration**: API server now accepts configurable host parameter
  - Defaults to `127.0.0.1` (localhost only) for security
  - Can be set to `0.0.0.0` for network access via `--network` flag
  - Console output shows appropriate URLs based on host configuration

### Enhanced

- **Installation Process**: Package now available via npm with simple global installation
- **Developer Experience**: Improved console output with network mode indicators
- **API Documentation**: Complete refresh with updated endpoints and examples

### Technical Details

- API server host binding is now configurable through `APIServerConfig.host` parameter
- Start command passes network flag through to API server entry point
- All endpoint displays and health checks use correct host based on configuration
- Maintained backward compatibility for existing API usage patterns (except mint endpoint)

## [0.1.2] - 2025-06-24

### Added

- **Background API Server**: Added REST API server that runs alongside the validator
  - Starts automatically with `solforge start` command
  - Stops automatically with `solforge stop` command
  - Exposes endpoints for validator operations and token management
- **New `mint` command**: Interactive token minting to any wallet address
  - Supports both interactive and CLI flag modes
  - Proper SPL token account creation and management
  - Follows same patterns as existing token cloner logic
- **API Endpoints**:
  - `GET /api/health` - Health check
  - `GET /api/validator/info` - Validator information
  - `GET /api/tokens` - List cloned tokens
  - `GET /api/programs` - List cloned programs
  - `POST /api/tokens/:symbol/mint` - Mint tokens to wallet
  - `GET /api/wallet/:address/balances` - Get wallet balances
  - `POST /api/airdrop` - Airdrop SOL to wallet
  - `GET /api/transactions/recent` - Get recent transactions

### Changed

- **Replaced `transfer` command with `mint` command**: The transfer command has been removed and replaced with a more focused mint command that handles token minting to arbitrary addresses
- **Streamlined minting logic**: Both CLI and API now use shared minting functions for consistency
- **API token response**: Removed `mintAmount` field from `/api/tokens` endpoint as it's intended for initial supply tracking, not runtime minting

### Removed

- `transfer` command - replaced with `mint` command
- `mintAmount` field from API token responses

### Technical Details

- API server runs on configurable port (default: 3000)
- Uses shared minting logic between CLI and API for consistency
- Proper SPL token account detection and creation
- Background process management with nohup
- CORS enabled for web application integration

---

## Previous Versions

_This changelog was started during active development. For earlier changes, please refer to the git commit history._
