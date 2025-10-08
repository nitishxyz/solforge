# SolForge Development Context

## Build/Test/Lint Commands
- **Build**: `bun run build:cli`
- **Dev**: `bun apps/cli/index.ts start`
- **Test**: `bun test` (no test files exist yet)
- **Lint**: `bunx @biomejs/biome check apps/cli/src`
- **Format**: `bunx @biomejs/biome format apps/cli/src --write`
- **Start**: `bun run --filter @solforge/cli build && ./apps/cli/dist/solforge`

## Code Style Guidelines
- **Runtime**: Bun with TypeScript ESNext modules
- **Imports**: Use `.js` extensions for local imports (e.g., `./commands/init.js`)
- **Types**: Strict TypeScript with Zod schemas for validation
- **Formatting**: Biome formatter (2-space indentation, double quotes)
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces
- **Error Handling**: Try-catch with chalk colored console output, process.exit(1) for CLI errors
- **CLI**: Commander.js for commands, inquirer for prompts, chalk for colors
- **Async**: Prefer async/await over promises, use Promise.all for concurrent operations
- **Comments**: JSDoc for functions, inline comments for complex logic only

## Project Structure
- Solana localnet orchestration tool for cloning mainnet programs/tokens
- Config-driven via `sf.config.json` files
- Commands: init, start, stop, status, transfer, reset