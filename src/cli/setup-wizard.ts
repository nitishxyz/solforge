import * as p from "@clack/prompts";
import { defaultConfig, type SolforgeConfig } from "../config";
import {
  cancelSetup,
  collectCustomEntries,
  ensure,
  validatePort,
  validatePositiveNumber,
  validatePubkey,
} from "./setup-utils";

const TOKEN_PRESETS = [
  { value: "usdc", label: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { value: "usdt", label: "USDT", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" },
];
const PROGRAM_PRESETS = [
  { value: "jupiter", label: "Jupiter", programId: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" },
  { value: "pump", label: "Pump core", programId: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P" },
  { value: "pump-amm", label: "Pump AMM", programId: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA" },
  { value: "pump-fees", label: "Pump fees", programId: "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ" },
];
export async function runSetupWizard(existing: SolforgeConfig = defaultConfig) {
  const base: SolforgeConfig = JSON.parse(JSON.stringify(existing));

  const rpcPort = Number(
    ensure(
      await p.text({
        message: "RPC port",
        initialValue: String(base.server.rpcPort ?? defaultConfig.server.rpcPort),
        validate: validatePort,
      }),
    ),
  );

  const wsPort = Number(
    ensure(
      await p.text({
        message: "WebSocket port",
        initialValue: String(base.server.wsPort ?? rpcPort + 1),
        validate: validatePort,
      }),
    ),
  );

  const guiEnabledResp = await p.confirm({
    message: "Enable GUI server?",
    initialValue: base.gui?.enabled ?? defaultConfig.gui.enabled,
  });
  if (p.isCancel(guiEnabledResp)) cancelSetup();
  const guiEnabled = guiEnabledResp !== false;

  let guiPort = base.gui?.port ?? defaultConfig.gui.port;
  if (guiEnabled) {
    guiPort = Number(
      ensure(
        await p.text({
          message: "GUI port",
          initialValue: String(guiPort ?? defaultConfig.gui.port),
          validate: validatePort,
        }),
      ),
    );
  }

  const endpoint = ensure(
    await p.text({
      message: "Source RPC endpoint for cloning",
      initialValue: base.clone.endpoint || defaultConfig.clone.endpoint,
      placeholder: defaultConfig.clone.endpoint,
      validate: (value) => (value ? undefined : "Endpoint is required"),
    }),
  ).trim();

  const tokenSelection = ensure(
    await p.multiselect({
      message: "Which tokens should be cloned into LiteSVM?",
      options: [
        ...TOKEN_PRESETS.map((token) => ({
          value: token.value,
          label: `${token.label} (${token.mint})`,
        })),
        { value: "__custom__", label: "Add custom token mint" },
      ],
      initialValues: TOKEN_PRESETS.filter((preset) =>
        base.clone.tokens?.includes(preset.mint),
      ).map((preset) => preset.value),
      required: false,
    }),
  ) as string[];
  let tokenSeed: string[] = [];
  if ((base.clone.tokens?.length ?? 0) > 0) {
    const keep = await p.confirm({
      message: `Keep existing token list (${base.clone.tokens.length})?`,
      initialValue: true,
    });
    if (p.isCancel(keep)) cancelSetup();
    if (keep) tokenSeed = [...base.clone.tokens];
  }

  const tokens = await resolveTokens(tokenSelection, tokenSeed);

  const programSelection = ensure(
    await p.multiselect({
      message: "Clone any on-chain programs?",
      options: [
        ...PROGRAM_PRESETS.map((program) => ({
          value: program.value,
          label: `${program.label} (${program.programId})`,
        })),
        { value: "__custom__", label: "Add custom program" },
      ],
      initialValues: PROGRAM_PRESETS.filter((preset) =>
        base.clone.programs?.includes(preset.programId),
      ).map((preset) => preset.value),
      required: false,
    }),
  ) as string[];
  let programSeed: string[] = [];
  if ((base.clone.programs?.length ?? 0) > 0) {
    const keepPrograms = await p.confirm({
      message: `Keep existing program list (${base.clone.programs.length})?`,
      initialValue: true,
    });
    if (p.isCancel(keepPrograms)) cancelSetup();
    if (keepPrograms) programSeed = [...base.clone.programs];
  }

  const programs = await resolvePrograms(programSelection, programSeed);

  const airdrops = await collectAirdrops(base.bootstrap?.airdrops ?? []);

  base.server.rpcPort = rpcPort;
  base.server.wsPort = wsPort;
  base.gui = { enabled: guiEnabled, port: guiPort ?? defaultConfig.gui.port };
  base.clone.endpoint = endpoint;
  base.clone.tokens = tokens;
  base.clone.programs = programs;
  base.bootstrap = { airdrops };

  return base;
}

async function resolveTokens(selections: string[], existing: string[] = []) {
  const set = new Set(existing);
  for (const selection of selections) {
    if (selection === "__custom__") {
      (await collectCustomEntries("token mint address")).forEach((value) => set.add(value));
      continue;
    }
    const preset = TOKEN_PRESETS.find((token) => token.value === selection);
    if (!preset) continue;
    const mint = ensure(
      await p.text({
        message: `Mint address for ${preset.label}`,
        initialValue: preset.mint,
        validate: validatePubkey,
      }),
    ).trim();
    set.add(mint);
  }
  return Array.from(set);
}

async function resolvePrograms(selections: string[], existing: string[] = []) {
  const set = new Set(existing);
  for (const selection of selections) {
    if (selection === "__custom__") {
      (await collectCustomEntries("program id")).forEach((value) => set.add(value));
      continue;
    }
    const preset = PROGRAM_PRESETS.find((program) => program.value === selection);
    if (!preset) continue;
    const programId = ensure(
      await p.text({
        message: `Program ID for ${preset.label}`,
        initialValue: preset.programId,
        validate: validatePubkey,
      }),
    ).trim();
    set.add(programId);
  }
  return Array.from(set);
}

async function collectAirdrops(existing: Array<{ address: string; amountSol: number }>) {
  const entries: Array<{ address: string; amountSol: number }> = [];
  if (existing.length > 0) {
    const keep = await p.confirm({
      message: `Keep existing airdrop recipients (${existing.length})?`,
      initialValue: true,
    });
    if (p.isCancel(keep)) cancelSetup();
    if (keep) entries.push(...existing);
  }

  while (true) {
    const address = await p.text({
      message:
        entries.length === 0
          ? "Airdrop recipient address (leave blank to skip)"
          : "Add another airdrop recipient (leave blank to finish)",
    });
    if (p.isCancel(address)) cancelSetup();
    const trimmed = typeof address === "string" ? address.trim() : "";
    if (!trimmed) break;
    const error = validatePubkey(trimmed);
    if (error) {
      p.log.error(error);
      continue;
    }
    const amount = ensure(
      await p.text({
        message: `Amount of SOL to airdrop to ${trimmed}`,
        initialValue: "100",
        validate: validatePositiveNumber,
      }),
    );
    entries.push({ address: trimmed, amountSol: Number(amount) });
  }

  return entries;
}
