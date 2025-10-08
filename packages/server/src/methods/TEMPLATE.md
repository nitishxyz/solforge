# RPC Method Template

Use this template when adding new RPC methods to SolForge.

## File Template

```typescript
import { PublicKey } from "@solana/web3.js"; // Only if needed
import type { RpcMethodHandler } from "../types"; // Adjust path based on location

/**
 * Implements the methodName RPC method
 * @see https://docs.solana.com/api/http#methodname
 */
export const methodName: RpcMethodHandler = (id, params, context) => {
  // 1. Parse parameters
  const [param1, param2, config] = params;
  
  // 2. Validate parameters (if needed)
  if (!param1) {
    return context.createErrorResponse(
      id,
      -32602,
      "Missing required parameter: param1"
    );
  }
  
  try {
    // 3. Execute the RPC logic
    const result = context.svm.someOperation();
    
    // 4. Format and return the response
    return context.createSuccessResponse(id, {
      context: { 
        slot: Number(context.slot),
        apiVersion: "1.18.0" // If needed
      },
      value: result
    });
  } catch (error: any) {
    // 5. Handle errors appropriately
    return context.createErrorResponse(
      id,
      -32603, // Use appropriate error code
      "Operation failed",
      error.message
    );
  }
};
```

## Common Patterns

### Methods that modify state
```typescript
// After successful operation, increment slot/blockHeight
if (success) {
  // This is handled in the main server now
  // Just return success response
  return context.createSuccessResponse(id, signature);
}
```

### Methods with optional config
```typescript
const [address, config] = params;
const encoding = config?.encoding || "base64";
const commitment = config?.commitment || "confirmed";
```

### Batch operations
```typescript
const results = addresses.map(addr => {
  try {
    // Process each item
    return processItem(addr);
  } catch {
    // Return null for failed items
    return null;
  }
});
```

## Error Codes Reference

- `-32700`: Parse error (JSON parsing failed)
- `-32600`: Invalid request (not a valid JSON-RPC request)
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000`: Generic server error
- `-32001`: Resource not found
- `-32002`: Resource unavailable
- `-32003`: Transaction rejected
- `-32004`: Method not supported
- `-32005`: Limit exceeded

## Checklist

Before committing a new RPC method:

- [ ] Method follows naming convention (camelCase)
- [ ] File uses kebab-case naming
- [ ] Proper TypeScript types used
- [ ] Error handling implemented
- [ ] Success case tested
- [ ] Error cases tested
- [ ] Added to methods/index.ts
- [ ] Documentation updated in README.md
- [ ] Follows SolForge patterns

## Examples in Codebase

- Simple query: See `get-balance.ts`
- Complex response: See `get-account-info.ts`
- Transaction handling: See `send-transaction.ts`
- Batch operation: See `get-multiple-accounts.ts`