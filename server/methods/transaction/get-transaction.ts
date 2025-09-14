import type { RpcMethodHandler } from "../../types";
import { VersionedTransaction } from "@solana/web3.js";

export const getTransaction: RpcMethodHandler = async (id, params, context) => {
  const [signature, config] = params || [];
  const encoding = config?.encoding ?? "json";

  try {
    const rec = context.getRecordedTransaction(signature);
    if (rec) {
      const tx = rec.tx as any;
      if (encoding === "base64") {
        const raw = Buffer.from(tx.serialize()).toString("base64");
        // Top-level version is required by some clients
        const isV0 = typeof (tx.message as any)?.version === "number" ? (tx.message as any).version === 0 : true;
        return context.createSuccessResponse(id, {
          slot: rec.slot,
          transaction: [raw, "base64"],
          version: isV0 ? 0 : "legacy",
          meta: {
            status: rec.err ? { Err: rec.err } : { Ok: null },
            err: rec.err ?? null,
            fee: rec.fee,
            loadedAddresses: { writable: [], readonly: [] },
            preBalances: Array.isArray(rec.preBalances) ? rec.preBalances : [],
            postBalances: Array.isArray(rec.postBalances) ? rec.postBalances : [],
            innerInstructions: [],
            logMessages: rec.logs || [],
            preTokenBalances: Array.isArray((rec as any).preTokenBalances) ? (rec as any).preTokenBalances : [],
            postTokenBalances: Array.isArray((rec as any).postTokenBalances) ? (rec as any).postTokenBalances : [],
            rewards: []
          },
          blockTime: rec.blockTime
        });
      }

      const msg: any = tx.message as any;
      const rawKeys1: any[] = Array.isArray(msg.staticAccountKeys)
        ? msg.staticAccountKeys
        : (Array.isArray(msg.accountKeys) ? msg.accountKeys : []);
      const accountKeys = rawKeys1.map((k: any) => {
        try { return typeof k === "string" ? k : k.toBase58(); } catch { return String(k); }
      });
      const compiled = Array.isArray(msg.compiledInstructions)
        ? msg.compiledInstructions
        : (Array.isArray(msg.instructions) ? msg.instructions : []);
      const instructions = compiled.map((ci: any) => {
        const dataBytes: Uint8Array = ci.data instanceof Uint8Array ? ci.data : Buffer.from(ci.data);
        return {
          programIdIndex: ci.programIdIndex,
          accounts: Array.from(ci.accountKeyIndexes || ci.accounts || []),
          data: context.encodeBase58(dataBytes)
        };
      });
      const addressTableLookups = (msg.addressTableLookups || []).map((l: any) => ({
        accountKey:
          typeof l.accountKey?.toBase58 === "function" ? l.accountKey.toBase58() : String(l.accountKey),
        writableIndexes: Array.from(l.writableIndexes || []),
        readonlyIndexes: Array.from(l.readonlyIndexes || [])
      }));
      const header =
        msg.header || {
          numRequiredSignatures: tx.signatures.length,
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 0
        };
      const recentBlockhash = msg.recentBlockhash || "";

      const isV0 = typeof msg.version === "number" ? msg.version === 0 : true;
      const result: any = {
        slot: rec.slot,
        transaction: {
          signatures: [signature],
          message: {
            accountKeys,
            header,
            recentBlockhash,
            instructions,
            addressTableLookups
          }
        },
        version: isV0 ? 0 : "legacy",
        meta: {
          status: rec.err ? { Err: rec.err } : { Ok: null },
          err: rec.err ?? null,
          fee: rec.fee,
          loadedAddresses: { writable: [], readonly: [] },
          preBalances: Array.isArray(rec.preBalances) ? rec.preBalances : [],
          postBalances: Array.isArray(rec.postBalances) ? rec.postBalances : [],
          innerInstructions: [],
          logMessages: rec.logs || [],
          preTokenBalances: Array.isArray((rec as any).preTokenBalances) ? (rec as any).preTokenBalances : [],
          postTokenBalances: Array.isArray((rec as any).postTokenBalances) ? (rec as any).postTokenBalances : [],
          rewards: []
        },
        blockTime: rec.blockTime
      };

      if (encoding === "jsonParsed") {
        const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
        const accountKeysParsed = accountKeys.map((pk: string, i: number) => ({
          pubkey: pk,
          signer:
            typeof msg.isAccountSigner === "function"
              ? !!msg.isAccountSigner(i)
              : i < (header?.numRequiredSignatures ?? 0),
          writable:
            typeof msg.isAccountWritable === "function"
              ? !!msg.isAccountWritable(i)
              : i < (header?.numRequiredSignatures ?? 0)
        }));
        const parsedInstructions = compiled.map((ci: any) => {
          const programId = accountKeys[ci.programIdIndex];
          let parsed: any = undefined;
          try {
            const data: Uint8Array = ci.data instanceof Uint8Array ? ci.data : Buffer.from(ci.data);
            if (programId === SYSTEM_PROGRAM_ID && data.length >= 12) {
              const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
              const discriminator = dv.getUint32(0, true);
              if (discriminator === 2 && (ci.accountKeyIndexes?.length ?? 0) >= 2) {
                const lamports = Number(dv.getBigUint64(4, true));
                const source = accountKeys[ci.accountKeyIndexes[0]];
                const destination = accountKeys[ci.accountKeyIndexes[1]];
                parsed = { type: "transfer", info: { source, destination, lamports } };
              }
            }
          } catch {}
          if (parsed) return { program: "system", programId, parsed };
          return {
            programId,
            accounts: (ci.accountKeyIndexes || []).map((ix: number) => accountKeys[ix]),
            data: context.encodeBase58(ci.data instanceof Uint8Array ? ci.data : Buffer.from(ci.data))
          };
        });
        result.transaction.message.accountKeys = accountKeysParsed;
        result.transaction.message.instructions = parsedInstructions;
      }

      return context.createSuccessResponse(id, result);
    }

    // Fallback: persistent store
    try {
      const row = await (context.store?.getTransaction(signature));
      if (row) {
        const errVal = row.errJson ? JSON.parse(row.errJson) : null;
        const preBalances = JSON.parse(row.preBalancesJson || "[]");
        const postBalances = JSON.parse(row.postBalancesJson || "[]");
        const logs = JSON.parse(row.logsJson || "[]");
        const versionVal = row.version === "0" || row.version === 0 ? 0 : row.version;
        if (encoding === "base64") {
          return context.createSuccessResponse(id, {
            slot: Number(row.slot),
            transaction: [row.rawBase64, "base64"],
            version: versionVal,
            meta: {
              status: errVal ? { Err: errVal } : { Ok: null },
              err: errVal,
              fee: Number(row.fee),
              loadedAddresses: { writable: [], readonly: [] },
              preBalances,
              postBalances,
              innerInstructions: [],
              logMessages: logs,
              preTokenBalances: JSON.parse(row.preTokenBalancesJson || "[]"),
              postTokenBalances: JSON.parse(row.postTokenBalancesJson || "[]"),
              rewards: []
            },
            blockTime: row.blockTime ? Number(row.blockTime) : null
          });
        } else if (encoding === "jsonParsed") {
          // Build jsonParsed similar to in-memory path
          const raw = Buffer.from(row.rawBase64, "base64");
          const tx = VersionedTransaction.deserialize(raw);
          const msg: any = tx.message as any;
          const rawKeys2: any[] = Array.isArray(msg.staticAccountKeys)
            ? msg.staticAccountKeys
            : (Array.isArray(msg.accountKeys) ? msg.accountKeys : []);
          const accountKeys = rawKeys2.map((k: any) => {
            try { return typeof k === "string" ? k : k.toBase58(); } catch { return String(k); }
          });
          const header = msg.header || { numRequiredSignatures: tx.signatures.length, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 };
          const compiled = Array.isArray(msg.compiledInstructions)
            ? msg.compiledInstructions
            : (Array.isArray(msg.instructions) ? msg.instructions : []);
          const parsedInstructions = compiled.map((ci: any) => {
            const programId = accountKeys[ci.programIdIndex];
            let parsed: any = undefined;
            try {
              const data: Uint8Array = ci.data instanceof Uint8Array ? ci.data : Buffer.from(ci.data);
              // Minimal system transfer parser
              if (programId === "11111111111111111111111111111111" && data.length >= 12) {
                const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
                const discriminator = dv.getUint32(0, true);
                if (discriminator === 2 && (ci.accountKeyIndexes?.length ?? 0) >= 2) {
                  const lamports = Number(dv.getBigUint64(4, true));
                  const source = accountKeys[ci.accountKeyIndexes[0]];
                  const destination = accountKeys[ci.accountKeyIndexes[1]];
                  parsed = { type: "transfer", info: { source, destination, lamports } };
                }
              }
            } catch {}
            if (parsed) return { program: "system", programId, parsed };
            return {
              programId,
              accounts: (ci.accountKeyIndexes || []).map((ix: number) => accountKeys[ix]),
              data: context.encodeBase58(ci.data instanceof Uint8Array ? ci.data : Buffer.from(ci.data))
            };
          });
          const accountKeysParsed = accountKeys.map((pk: string, i: number) => ({
            pubkey: pk,
            signer:
              typeof msg.isAccountSigner === "function"
                ? !!msg.isAccountSigner(i)
                : i < (header?.numRequiredSignatures ?? 0),
            writable:
              typeof msg.isAccountWritable === "function"
                ? !!msg.isAccountWritable(i)
                : i < (header?.numRequiredSignatures ?? 0)
          }));
          const result: any = {
            slot: Number(row.slot),
            transaction: {
              signatures: [signature],
              message: {
                accountKeys: accountKeysParsed,
                header,
                recentBlockhash: msg.recentBlockhash || "",
                instructions: parsedInstructions,
                addressTableLookups: msg.addressTableLookups || []
              }
            },
            version: (row.version === "0" || row.version === 0) ? 0 : row.version,
            meta: {
              status: errVal ? { Err: errVal } : { Ok: null },
              err: errVal,
              fee: Number(row.fee),
              loadedAddresses: { writable: [], readonly: [] },
              preBalances,
              postBalances,
              innerInstructions: [],
              logMessages: logs,
              preTokenBalances: JSON.parse(row.preTokenBalancesJson || "[]"),
              postTokenBalances: JSON.parse(row.postTokenBalancesJson || "[]"),
              rewards: []
            },
            blockTime: row.blockTime ? Number(row.blockTime) : null
          };
          return context.createSuccessResponse(id, result);
        } else {
          const raw = Buffer.from(row.rawBase64, "base64");
          const tx = VersionedTransaction.deserialize(raw);
          const msg: any = tx.message as any;
          const rawKeys3: any[] = Array.isArray(msg.staticAccountKeys)
            ? msg.staticAccountKeys
            : (Array.isArray(msg.accountKeys) ? msg.accountKeys : []);
          const accountKeys = rawKeys3.map((k: any) => {
            try { return typeof k === "string" ? k : k.toBase58(); } catch { return String(k); }
          });
          const header = msg.header || { numRequiredSignatures: tx.signatures.length, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 };
          const compiled = Array.isArray(msg.compiledInstructions)
            ? msg.compiledInstructions
            : (Array.isArray(msg.instructions) ? msg.instructions : []);
          const instructions = compiled.map((ci: any) => ({
            programIdIndex: ci.programIdIndex,
            accounts: Array.from(ci.accountKeyIndexes || ci.accounts || []),
            data: context.encodeBase58(ci.data instanceof Uint8Array ? ci.data : Buffer.from(ci.data))
          }));
          const result: any = {
            slot: Number(row.slot),
            transaction: {
              signatures: [signature],
              message: { accountKeys, header, recentBlockhash: msg.recentBlockhash || "", instructions, addressTableLookups: msg.addressTableLookups || [] }
            },
            version: versionVal,
            meta: {
              status: errVal ? { Err: errVal } : { Ok: null },
              err: errVal,
              fee: Number(row.fee),
              loadedAddresses: { writable: [], readonly: [] },
              preBalances,
              postBalances,
              innerInstructions: [],
              logMessages: logs,
              preTokenBalances: JSON.parse(row.preTokenBalancesJson || "[]"),
              postTokenBalances: JSON.parse(row.postTokenBalancesJson || "[]"),
              rewards: []
            },
            blockTime: row.blockTime ? Number(row.blockTime) : null
          };
          return context.createSuccessResponse(id, result);
        }
      }
    } catch {}

    // Fallback to LiteSVM history when no local record exists
    const sigBytes = context.decodeBase58(signature);
    const txh = (context.svm as any).getTransaction(sigBytes);
    if (!txh) return context.createSuccessResponse(id, null);

    const isError = "err" in txh;
    const logs = isError ? txh.meta().logs() : txh.logs();
    const errVal = isError ? txh.err() : null;
    const status = isError ? { Err: errVal } : { Ok: null };
    const isV0 = true;
    return context.createSuccessResponse(id, {
      slot: Number(context.slot),
      transaction: {
        signatures: [signature],
      },
      version: isV0 ? 0 : "legacy",
      meta: {
        status,
        err: errVal,
        fee: 5000,
        loadedAddresses: { writable: [], readonly: [] },
        preBalances: [],
        postBalances: [],
        innerInstructions: [],
        logMessages: logs,
        preTokenBalances: [],
        postTokenBalances: [],
        rewards: []
      },
      blockTime: Math.floor(Date.now() / 1000)
    });
  } catch (error: any) {
    return context.createErrorResponse(id, -32602, "Invalid params", error.message);
  }
};
