# Development Guidelines for SolForge

## Core Principles

### 1. Keep It Modular
- **No huge files**: If a file exceeds 200 lines, consider splitting it
- **Single responsibility**: Each module should do one thing well
- **Clear boundaries**: Well-defined interfaces between modules

### 2. Keep It Simple
- **Straightforward code**: Prefer clarity over cleverness
- **Minimal abstractions**: Only abstract when there's clear benefit
- **Explicit over implicit**: Make intentions clear in code

### 3. Keep It Fast
- **Performance matters**: This is a performance-critical tool
- **Measure first**: Profile before optimizing
- **Memory conscious**: Avoid unnecessary allocations

## Technology Rules

### Package Manager
- **ALWAYS use Bun**: No npm, yarn, pnpm, or anything else
- Commands:
  - `bun install` (not npm install)
  - `bun run` (not npm run)
  - `bun test` (not jest/vitest)
  - `bun build` (not webpack/esbuild)

### Runtime
- **Bun exclusively**: Use Bun-native APIs when available
- Prefer `Bun.serve()` over Express
- Use `Bun.file()` over `fs.readFile()`
- Use `bun:test` for testing

## Code Style

### File Naming
- **kebab-case**: All files use kebab-case
  - ✅ `rpc-server.ts`
  - ✅ `get-account-info.ts`
  - ❌ `rpcServer.ts`
  - ❌ `GetAccountInfo.ts`

### Directory Structure
```
packages/server/src/
├── methods/
│   ├── account/           # When account.ts gets too big
│   │   ├── get-account-info.ts
│   │   ├── get-balance.ts
│   │   ├── get-multiple-accounts.ts
│   │   └── index.ts
│   ├── transaction/       # When transaction.ts gets too big
│   │   ├── send-transaction.ts
│   │   ├── simulate-transaction.ts
│   │   └── index.ts
│   └── index.ts
```

### File Size Guidelines
- **< 100 lines**: Ideal file size
- **100-200 lines**: Acceptable
- **> 200 lines**: Consider splitting
- **> 300 lines**: Must split

### When to Split Files
If `account.ts` or `transaction.ts` grows large:
1. Create a directory with the same name
2. Split into individual method files
3. Create an index.ts that exports everything
4. Update imports to maintain compatibility

Example migration:
```typescript
// Before: packages/server/src/methods/account.ts (300+ lines)
export const getAccountInfo = ...
export const getBalance = ...
export const requestAirdrop = ...

// After: packages/server/src/methods/account/index.ts
export { getAccountInfo } from './get-account-info';
export { getBalance } from './get-balance';
export { requestAirdrop } from './request-airdrop';
```

## TypeScript Guidelines

### Types
- **Define interfaces**: Use interfaces for object shapes
- **Avoid `any`**: Use `unknown` if type is truly unknown
- **Export types**: Keep types in separate files when shared

### Imports
- **Explicit imports**: Import only what you need
- **Type imports**: Use `import type` when importing only types
- **Organized imports**: Group by external, internal, types

```typescript
// External
import { PublicKey } from "@solana/web3.js";

// Internal
import { someHelper } from "../helpers";

// Types
import type { RpcMethodHandler } from "../types";
```

## Method Implementation

### Structure
Each RPC method should follow this pattern:

```typescript
import type { RpcMethodHandler } from "../types";

export const methodName: RpcMethodHandler = (id, params, context) => {
  // 1. Parse and validate params
  const [param1, param2] = params;
  
  // 2. Execute logic
  try {
    const result = context.svm.someOperation();
    
    // 3. Return formatted response
    return context.createSuccessResponse(id, result);
  } catch (error: any) {
    // 4. Handle errors appropriately
    return context.createErrorResponse(id, -32602, "Error message", error.message);
  }
};
```

### Error Codes
Use standard JSON-RPC error codes:
- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000` to `-32099`: Server errors

## Testing

### Test Organization
- Test files next to source: `method-name.test.ts`
- Use descriptive test names
- Test both success and error cases

### Test Structure
```typescript
import { test, expect } from "bun:test";

test("getAccountInfo returns account data", async () => {
  // Arrange
  const server = createTestServer();
  
  // Act
  const result = await server.handleRequest({...});
  
  // Assert
  expect(result.result).toBeDefined();
});
```

## Documentation

### Code Comments
- **Minimal comments**: Code should be self-documenting
- **Why, not what**: Explain complex logic, not obvious code
- **TODO format**: `// TODO: [description]`

### Method Documentation
Each new RPC method needs:
1. Entry in README.md
2. TypeScript types defined
3. Test coverage
4. Error cases documented

## Git Workflow

### Commit Messages
- **Conventional commits**: `type: description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Examples:
  - `feat: add getTokenAccounts RPC method`
  - `fix: handle empty transaction array`
  - `refactor: split account methods into separate files`

### Branch Naming
- `feature/method-name` for new methods
- `fix/issue-description` for bug fixes
- `refactor/module-name` for refactoring

## Performance Considerations

### Do's
- ✅ Use `BigInt` for lamports
- ✅ Cache frequently accessed data
- ✅ Use batch operations when possible
- ✅ Profile before optimizing

### Don'ts
- ❌ Premature optimization
- ❌ Synchronous file I/O
- ❌ Unnecessary object cloning
- ❌ Large in-memory buffers

## Adding New RPC Methods

### Checklist
- [ ] Create method file in appropriate directory
- [ ] Implement method following standard pattern
- [ ] Add to method exports in index.ts
- [ ] Register in rpcMethods object
- [ ] Add tests
- [ ] Update README.md
- [ ] Test with real client

### Template
```typescript
// packages/server/src/methods/category/method-name.ts
import type { RpcMethodHandler } from "../../types";

/**
 * Implements the getMethodName RPC method
 * @see https://docs.solana.com/api/http#getmethodname
 */
export const getMethodName: RpcMethodHandler = (id, params, context) => {
  const [param1, config] = params;
  
  try {
    // Implementation
    const result = {};
    
    return context.createSuccessResponse(id, {
      context: { slot: Number(context.slot) },
      value: result
    });
  } catch (error: any) {
    return context.createErrorResponse(
      id, 
      -32602, 
      "Invalid params", 
      error.message
    );
  }
};
```

## Review Checklist

Before submitting code:
- [ ] Files under 200 lines
- [ ] Using kebab-case filenames
- [ ] No npm/yarn commands
- [ ] Types properly defined
- [ ] Errors handled appropriately
- [ ] Tests written
- [ ] Documentation updated

## Questions?

When in doubt:
1. Keep it simple
2. Keep it modular
3. Keep it fast
4. Use Bun

Remember: We're building a tool that developers will use hundreds of times per day. Every millisecond counts, and every good developer experience decision matters.