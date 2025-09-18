import { type ChangeEvent, useState } from "react";
import { Modal } from "./modal";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (payload: {
		mint: string;
		endpoint?: string;
		cloneAccounts: boolean;
		holders?: number;
		allAccounts?: boolean;
	}) => Promise<void>;
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
				holders:
					cloneAccounts && !allAccounts && holders.trim()
						? Number(holders)
						: undefined,
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
			title="Clone Token"
			icon="fa-coins"
			iconColor="amber"
			footer={
				<div className="flex justify-between items-center">
					<div className="text-xs text-gray-500">
						<i className="fas fa-info-circle mr-1"></i>
						Clone SPL tokens from mainnet
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
							disabled={pending || mint.trim().length === 0}
							className={`btn-primary ${pending || mint.trim().length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
						>
							{pending ? (
								<>
									<div className="spinner"></div>
									<span>Cloning Token</span>
								</>
							) : (
								<>
									<i className="fas fa-download"></i>
									<span>Clone Token</span>
								</>
							)}
						</button>
					</div>
				</div>
			}
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
						Mint Address *
					</label>
					<div className="relative">
						<input
							value={mint}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setMint(event.target.value)
							}
							placeholder="Enter token mint address (e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)"
							className="input pl-10 font-mono text-sm"
						/>
						<i className="fas fa-coin absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
					</div>
				</div>

				<div className="space-y-2">
					<label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
						RPC Endpoint (Optional)
					</label>
					<div className="relative">
						<input
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
							checked={cloneAccounts}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setCloneAccounts(event.target.checked)
							}
							className="checkbox"
						/>
						<div>
							<span className="text-sm text-white group-hover:text-purple-300 transition-colors">
								Clone Token Accounts
							</span>
							<p className="text-xs text-gray-500 mt-0.5">
								Include holder accounts for this token
							</p>
						</div>
					</label>

					{cloneAccounts && (
						<div className="ml-8 space-y-4 pt-3 border-t border-white/5">
							<label className="flex items-center gap-3 cursor-pointer group">
								<input
									type="checkbox"
									checked={allAccounts}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										setAllAccounts(event.target.checked)
									}
									className="checkbox"
								/>
								<div>
									<span className="text-sm text-white group-hover:text-purple-300 transition-colors">
										Clone All Accounts
									</span>
									<p className="text-xs text-gray-500 mt-0.5">
										Warning: This may be slow for popular tokens
									</p>
								</div>
							</label>

							{!allAccounts && (
								<div className="space-y-2">
									<label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
										Top Holders Limit
									</label>
									<div className="relative">
										<input
											value={holders}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												setHolders(event.target.value)
											}
											placeholder="20"
											type="number"
											min="1"
											max="100"
											className="input pl-10"
										/>
										<i className="fas fa-users absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
									</div>
									<p className="text-xs text-gray-500">
										Number of top holders to clone
									</p>
								</div>
							)}
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
