## How Surfpool Handles Complete Transaction Information

In the reference/surfpool implementation, complete transaction information is **NOT** handled during `sendTransaction`. Instead, they use a two-phase approach:

### 1. **During `sendTransaction` (reference/surfpool/crates/core/src/rpc/full.rs:1496-1526)**
   - The transaction is received and passed to a command channel
   - A `TransactionStatusEvent` channel is created for status updates
   - The transaction is sent to the block production runloop via `SimnetCommand::TransactionReceived`
   - The RPC waits for initial status via the status channel

### 2. **During Block Production/Processing (reference/surfpool/crates/core/src/runloops/mod.rs:215-218)**
   - The transaction is processed asynchronously in `process_transaction`
   - This happens in the block production runloop, not directly in the RPC call

### 3. **Complete Transaction Processing (reference/surfpool/crates/core/src/surfnet/locker.rs:766-804)**
   The `process_transaction` method:
   - Fetches all required accounts from local cache or remote RPC
   - Handles address lookup tables
   - Simulates the transaction (if preflight is enabled)
   - Executes the transaction
   - **Captures complete transaction metadata including:**
     - Account states before/after
     - Token account states
     - Compute units consumed
     - Logs
     - Inner instructions
     - Return data
   - Stores the complete transaction in `svm_writer.transactions` map

### 4. **Transaction Storage (reference/surfpool/crates/core/src/surfnet/locker.rs:1461-1480)**
   In `handle_execution_success`:
   ```rust
   svm_writer.transactions.insert(
       transaction_meta.signature,
       SurfnetTransactionStatus::processed(
           transaction_with_status_meta.clone(),
           mutated_account_pubkeys,
       ),
   );
   ```
   The complete transaction with all metadata is stored for later retrieval.

### Key Insight:
**The complete transaction information is captured AFTER execution during the block production phase, not during the initial `sendTransaction` RPC call.** The `sendTransaction` just queues the transaction and waits for a status update. The actual processing with full metadata capture happens asynchronously in the block production runloop.

This is why they can later retrieve the full transaction details via `getTransaction` - all the metadata was captured during execution and stored in the transactions map.
› finish
In the surfpool reference implementation, complete transaction information is handled **after** the `sendTransaction` RPC call, during the block production/processing phase:

1. **`sendTransaction` only queues**: The RPC method just sends the transaction to a command channel and waits for initial status
2. **Processing happens asynchronously**: The transaction is processed in the block production runloop via `process_transaction`
3. **Complete metadata captured during execution**: All transaction details (account states before/after, token accounts, logs, compute units, etc.) are captured in `handle_execution_success`
4. **Stored for later retrieval**: The complete `TransactionWithStatusMeta` is stored in the `transactions` map with all metadata

The key is that transaction processing is decoupled from the RPC call - full transaction information is captured during actual execution in the block production loop, not during the initial send.› finish › done (0ms)
