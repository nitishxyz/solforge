import { type ChangeEvent, useId, useState } from "react";
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
	const programIdId = useId();
	const endpointId = useId();
	const accountLimitId = useId();
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
		} catch (err: unknown) {
			const message =
				err && typeof err === "object" && "message" in err
					? String((err as { message?: unknown }).message)
					: String(err);
			setError(message);
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
			title="Clone Program"
			icon="fa-code"
			iconColor="blue"
			footer={
				<div className="flex justify-between items-center">
					<div className="text-xs text-gray-500">
						<i className="fas fa-info-circle mr-1"></i>
						Clone from Solana mainnet or custom RPC
					</div>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => !pending && onClose()}
							disabled={pending}
							className="btn-secondary"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={pending || programId.trim().length === 0}
							className={`btn-primary ${pending || programId.trim().length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
						>
							{pending ? (
								<>
									<div className="spinner"></div>
									<span>Cloning Program</span>
								</>
							) : (
								<>
									<i className="fas fa-download"></i>
									<span>Clone Program</span>
								</>
							)}
						</button>
					</div>
				</div>
			}
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<label
						htmlFor={programIdId}
						className="block text-xs font-semibold text-gray-400 uppercase tracking-wider"
					>
						Program ID *
					</label>
					<div className="relative">
						<input
							id={programIdId}
							value={programId}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setProgramId(event.target.value)
							}
							placeholder="Enter program public key (e.g., TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)"
							className="input pl-10 font-mono text-sm"
						/>
						<i className="fas fa-fingerprint absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
					</div>
				</div>

				<div className="space-y-2">
					<label
						htmlFor={endpointId}
						className="block text-xs font-semibold text-gray-400 uppercase tracking-wider"
					>
						RPC Endpoint (Optional)
					</label>
					<div className="relative">
						<input
							id={endpointId}
							value={endpoint}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setEndpoint(event.target.value)
							}
							placeholder="https://api.mainnet-beta.solana.com (default)"
							className="input pl-10"
						/>
						<i className="fas fa-globe absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
					</div>
				</div>

				<div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
					<label className="flex items-center gap-3 cursor-pointer group">
						<input
							type="checkbox"
							checked={withAccounts}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setWithAccounts(event.target.checked)
							}
							className="checkbox"
						/>
						<div>
							<span className="text-sm text-white group-hover:text-purple-300 transition-colors">
								Clone Program Accounts
							</span>
							<p className="text-xs text-gray-500 mt-0.5">
								Include accounts owned by this program
							</p>
						</div>
					</label>

					{withAccounts && (
						<div className="ml-8 space-y-2 pt-2 border-t border-white/5">
							<label
								htmlFor={accountLimitId}
								className="block text-xs font-semibold text-gray-400 uppercase tracking-wider"
							>
								Account Limit
							</label>
							<div className="relative">
								<input
									id={accountLimitId}
									value={accountsLimit}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										setAccountsLimit(event.target.value)
									}
									placeholder="100"
									type="number"
									min="1"
									max="1000"
									className="input pl-10"
								/>
								<i className="fas fa-list-ol absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
							</div>
							<p className="text-xs text-gray-500">
								Maximum number of accounts to clone
							</p>
						</div>
					)}
				</div>

				{error && (
					<div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
						<i className="fas fa-exclamation-circle text-red-400 mt-0.5"></i>
						<p className="text-sm text-red-300">{error}</p>
					</div>
				)}
			</div>
		</Modal>
	);
}
