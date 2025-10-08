# SolForge Documentation

This directory contains comprehensive documentation for the SolForge local Solana development environment.

## 📋 Index

### Planning Documents

1. **[parser-enhancement-plan.md](./parser-enhancement-plan.md)** - Comprehensive roadmap for enhancing instruction parsers
   - Current coverage gaps analysis
   - Token-2022 extension support plan  
   - IDL-based parser design
   - Metaplex program support
   - 4-phase implementation strategy

2. **[instruction-storage-plan.md](./instruction-storage-plan.md)** - Database schema for storing parsed instructions
   - New `tx_instructions` table design
   - Indexing strategy for queryable transactions
   - Migration and backfill approach
   - Hybrid storage (scalars + JSON)

### Progress Tracking

3. **[parser-progress.md](./parser-progress.md)** - Current status and achievements
   - ✅ Phase 1 COMPLETED: 30 core Token-2022 instructions
   - Coverage increased from 20% → 85%
   - Testing plan and next steps
   - Performance and architecture notes

## 🎯 Quick Navigation

### For Developers
- **Want to add a new parser?** → See [parser-enhancement-plan.md](./parser-enhancement-plan.md#implementation-plan)
- **Want to understand parser coverage?** → See [parser-progress.md](./parser-progress.md#coverage-statistics)
- **Want to query transactions by instruction type?** → See [instruction-storage-plan.md](./instruction-storage-plan.md#enabled-queries)

### For Project Planning
- **Roadmap** → [parser-enhancement-plan.md - Phases 1-4](./parser-enhancement-plan.md#implementation-plan)
- **Current Status** → [parser-progress.md - Phase 1 Complete](./parser-progress.md#-phase-1-token-2022-core-instructions---completed)
- **Future Work** → [parser-progress.md - Next Steps](./parser-progress.md#-next-steps)

## 📊 Key Achievements

### Transaction Parsing
- **30 instruction types** now fully parsed
- Covers ~60% of mainnet token transactions
- Using official `@solana/spl-token` decoders
- Solana Explorer-compatible output

### Supported Instructions
- ✅ All core token operations (Transfer, Mint, Burn)
- ✅ Approval & delegation workflows
- ✅ Account lifecycle management
- ✅ Authority management (SetAuthority, Freeze/Thaw)
- ✅ Multisig operations
- ✅ Wrapped SOL (SyncNative)

## 🚀 Upcoming Features

### Phase 2: Extension Instructions
- Transfer Fee extension
- Interest Bearing tokens
- Confidential Transfers
- Memo Transfer, CPI Guard, etc.

### Phase 3: IDL-Based Parsing
- Parse ANY Anchor program using its IDL
- Local IDL storage (`.solforge/idls/`)
- On-chain IDL fetching
- Custom program support

### Phase 4: Metaplex Programs
- Token Metadata
- Candy Machine v2/v3
- Bubblegum (compressed NFTs)

## 📁 File Structure

```
docs/
├── README.md                        # This file
├── parser-enhancement-plan.md       # Comprehensive enhancement roadmap
├── instruction-storage-plan.md      # Database schema for parsed instructions
└── parser-progress.md               # Current achievements and status
```

## 🔗 Related Code

### Parser Implementation
- **Main parser**: [`packages/server/src/lib/instruction-parser.ts`](../packages/server/src/lib/instruction-parser.ts)
- **SPL Token parser**: [`packages/server/src/lib/parsers/spl-token.ts`](../packages/server/src/lib/parsers/spl-token.ts)
- **ATA parser**: [`packages/server/src/lib/parsers/spl-associated-token-account.ts`](../packages/server/src/lib/parsers/spl-associated-token-account.ts)

### Transaction Storage
- **RPC server**: [`packages/server/src/rpc-server.ts`](../packages/server/src/rpc-server.ts) (recordTransaction)
- **Database store**: [`packages/server/src/db/tx-store.ts`](../packages/server/src/db/tx-store.ts)
- **Transaction schema**: [`packages/server/src/db/schema/transactions.ts`](../packages/server/src/db/schema/transactions.ts)

## 📝 Contributing

When adding new parsers or features:

1. **Read the plan** - Check [parser-enhancement-plan.md](./parser-enhancement-plan.md) for context
2. **Follow patterns** - Use existing parsers as templates
3. **Add tests** - See testing plan in [parser-progress.md](./parser-progress.md#-testing-plan)
4. **Update docs** - Keep this documentation current
5. **Check coverage** - Aim for completeness within each phase

## 🎓 Learning Resources

### Understanding Solana Instructions
- [Solana Docs - Instructions](https://docs.solana.com/developing/programming-model/transactions#instructions)
- [SPL Token Program](https://spl.solana.com/token)
- [Token-2022 Extensions](https://solana.com/developers/guides/token-extensions/getting-started)

### Parser Development
- [@solana/spl-token decoders](https://github.com/solana-labs/solana-program-library/tree/master/token/js/src/instructions)
- [Anchor IDL format](https://www.anchor-lang.com/docs/idl)
- [Metaplex programs](https://developers.metaplex.com/)

## 🐛 Known Issues

See [parser-progress.md - Known Limitations](./parser-progress.md#-known-limitations)

## 💬 Questions?

- **Architecture questions**: See [parser-enhancement-plan.md - Open Questions](./parser-enhancement-plan.md#open-questions)
- **Implementation help**: Check existing parser code in `packages/server/src/lib/parsers/`
- **Feature requests**: Add to [parser-enhancement-plan.md](./parser-enhancement-plan.md)

---

Last updated: January 2025
