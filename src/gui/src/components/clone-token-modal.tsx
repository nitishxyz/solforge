import { type ChangeEvent, useState } from "react";
import { Modal } from "./modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { mint: string; endpoint?: string; cloneAccounts: boolean; holders?: number; allAccounts?: boolean }) => Promise<void>;
}

export function CloneTokenModal({ isOpen, onClose, onSubmit }: Props) {
  const [mint, setMint] = useState("");
  const [endpoint, setEndpoint] = useState("");
  // Default OFF to avoid hitting public RPC rate limits by cloning holders.
  const [cloneAccounts, setCloneAccounts] = useState(false);
  const [holders, setHolders] = useState("20");
  const [allAccounts, setAllAccounts] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        mint: mint.trim(),
        endpoint: endpoint.trim() ? endpoint.trim() : undefined,
        cloneAccounts,
        holders: cloneAccounts && !allAccounts && holders.trim() ? Number(holders) : undefined,
        allAccounts,
      });
      onClose();
      setMint("");
      setEndpoint("");
      setHolders("20");
      setAllAccounts(false);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!pending) onClose();
      }}
      title="Clone token mint"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || mint.trim().length === 0}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {pending ? "Cloning…" : "Clone"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Mint address</span>
          <input
            value={mint}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setMint(event.target.value)}
            placeholder="Enter mint public key"
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Source endpoint (optional)</span>
          <input
            value={endpoint}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEndpoint(event.target.value)}
            placeholder="https://api.mainnet-beta.solana.com"
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={cloneAccounts}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setCloneAccounts(event.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-400"
          />
          Clone token accounts
        </label>
        {cloneAccounts ? (
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={allAccounts}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setAllAccounts(event.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-400"
              />
              Clone all accounts (may be slow)
            </label>
            {!allAccounts ? (
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">Top holders</span>
                <input
                  value={holders}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setHolders(event.target.value)}
                  placeholder="20"
                  className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
                />
              </label>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </Modal>
  );
}
