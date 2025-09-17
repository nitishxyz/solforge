import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import type { TokenSummary } from "../api";

interface Props {
  tokens: TokenSummary[];
  onAirdrop: (address: string, lamports: string) => Promise<string | void>;
  onMint: (mint: string, owner: string, amountRaw: string) => Promise<string | void>;
}

const SOL_OPTION = { value: "SOL", label: "SOL (Lamports)", decimals: 9 } as const;

const BIGINT_TEN = 10n;

function toBaseUnits(rawInput: string, decimals: number) {
  const input = rawInput.trim();
  if (!input) throw new Error("Amount is required");
  const negative = input.startsWith("-");
  if (negative) throw new Error("Amount must be positive");
  const [wholeRaw = "0", fracRaw = ""] = input.split(".");
  const whole = wholeRaw.replace(/[^0-9]/g, "") || "0";
  const fracClean = fracRaw.replace(/[^0-9]/g, "");
  if (fracClean.length > decimals) throw new Error(`Too many decimal places (max ${decimals})`);
  const scale = BIGINT_TEN ** BigInt(decimals);
  const wholeValue = BigInt(whole);
  const fracPadded = decimals === 0 ? "0" : fracClean.padEnd(decimals, "0");
  const fracValue = BigInt(fracPadded || "0");
  const total = wholeValue * scale + fracValue;
  if (total <= 0n) throw new Error("Amount must be greater than zero");
  return total.toString();
}

function formatTokenLabel(token: TokenSummary) {
  const suffix = token.mintAuthority ? `Authority ${token.mintAuthority.slice(0, 6)}…` : "No authority";
  return `${token.mint.slice(0, 6)}…${token.mint.slice(-4)} · ${token.decimals} dec · ${suffix}`;
}

export function AirdropMintForm({ tokens, onAirdrop, onMint }: Props) {
  const [asset, setAsset] = useState<string>(SOL_OPTION.value);
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const options = useMemo(() => {
    const tokenOpts = tokens.map((token) => ({
      value: token.mint,
      label: formatTokenLabel(token),
      decimals: token.decimals,
    }));
    return [SOL_OPTION, ...tokenOpts];
  }, [tokens]);

  const selected = options.find((opt) => opt.value === asset) ?? SOL_OPTION;

  const submit = async () => {
    if (!recipient.trim()) throw new Error("Recipient address is required");
    const canonicalRecipient = recipient.trim();
    if (asset === SOL_OPTION.value) {
      const lamports = toBaseUnits(amount, SOL_OPTION.decimals);
      const signature = await onAirdrop(canonicalRecipient, lamports);
      return signature ? `Airdrop signature: ${signature}` : "Airdrop submitted";
    }
    const raw = toBaseUnits(amount, selected.decimals);
    const signature = await onMint(asset, canonicalRecipient, raw);
    return signature ? `Mint signature: ${signature}` : "Mint submitted";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const note = await submit();
      setMessage(note);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-slate-900/60 p-6 shadow-soft backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Airdrop / Mint</h2>
        <span className="text-xs text-slate-400">Faucet powered</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">Recipient address</span>
          <input
            value={recipient}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setRecipient(event.target.value)}
            placeholder="Enter public key"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">Asset</span>
          <select
            value={asset}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setAsset(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">Amount</span>
          <input
            value={amount}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setAmount(event.target.value)}
            placeholder="1"
            inputMode="decimal"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
          />
          <span className="text-xs text-slate-500">
            {asset === SOL_OPTION.value
              ? "Displayed in SOL (9 decimals)."
              : `Displayed in tokens (${selected.decimals} decimals).`}
          </span>
        </label>
        <div className="flex flex-col justify-end">
          <button
            type="submit"
            disabled={pending}
            className="mt-auto inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {pending ? "Processing…" : asset === SOL_OPTION.value ? "Airdrop SOL" : "Mint Tokens"}
          </button>
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-rose-400">{error}</p>
      ) : message ? (
        <p className="mt-3 text-sm text-emerald-400">{message}</p>
      ) : null}
    </form>
  );
}
