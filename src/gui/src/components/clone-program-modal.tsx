import { type ChangeEvent, useState } from "react";
import { Modal } from "./modal";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (payload: {
		programId: string;
		endpoint?: string;
		withAccounts: boolean;
		accountsLimit?: number;
	}) => Promise<void>;
}

export function CloneProgramModal({ isOpen, onClose, onSubmit }: Props) {
	const [programId, setProgramId] = useState("");
	const [endpoint, setEndpoint] = useState("");
	const [withAccounts, setWithAccounts] = useState(true);
	const [accountsLimit, setAccountsLimit] = useState("100");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async () => {
		setPending(true);
		setError(null);
		try {
			await onSubmit({
				programId: programId.trim(),
				endpoint: endpoint.trim() ? endpoint.trim() : undefined,
				withAccounts,
				accountsLimit:
					withAccounts && accountsLimit.trim()
						? Number(accountsLimit)
						: undefined,
			});
			onClose();
			setProgramId("");
			setEndpoint("");
			setAccountsLimit("100");
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
			title="Clone program from RPC"
			footer={
				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={handleSubmit}
						disabled={pending || programId.trim().length === 0}
						className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
					>
						{pending ? "Cloning…" : "Clone"}
					</button>
				</div>
			}
		>
			<div className="space-y-4">
				<label className="flex flex-col gap-2">
					<span className="text-xs uppercase tracking-wide text-slate-500">
						Program ID
					</span>
					<input
						value={programId}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							setProgramId(event.target.value)
						}
						placeholder="Enter program public key"
						className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
					/>
				</label>
				<label className="flex flex-col gap-2">
					<span className="text-xs uppercase tracking-wide text-slate-500">
						Source endpoint (optional)
					</span>
					<input
						value={endpoint}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							setEndpoint(event.target.value)
						}
						placeholder="https://api.mainnet-beta.solana.com"
						className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
					/>
				</label>
				<label className="flex items-center gap-2 text-xs text-slate-400">
					<input
						type="checkbox"
						checked={withAccounts}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							setWithAccounts(event.target.checked)
						}
						className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-400"
					/>
					Clone owned accounts
				</label>
				{withAccounts ? (
					<label className="flex flex-col gap-2">
						<span className="text-xs uppercase tracking-wide text-slate-500">
							Accounts limit
						</span>
						<input
							value={accountsLimit}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setAccountsLimit(event.target.value)
							}
							placeholder="100"
							className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
						/>
					</label>
				) : null}
				{error ? <p className="text-sm text-rose-400">{error}</p> : null}
			</div>
		</Modal>
	);
}
