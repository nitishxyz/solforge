import { type ChangeEvent, useId, useState, useEffect } from "react";
import type { CloneTokenPayload } from "../api/types";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (payload: CloneTokenPayload) => void;
	isLoading?: boolean;
}

export function CloneTokenModal({
	isOpen,
	onClose,
	onSubmit,
	isLoading = false,
}: Props) {
	const mintId = useId();
	const endpointId = useId();
	const holdersId = useId();
	const [mint, setMint] = useState("");
	const [endpoint, setEndpoint] = useState("");
	const [cloneAccounts, setCloneAccounts] = useState(false);
	const [holders, setHolders] = useState("20");
	const [allAccounts, setAllAccounts] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isOpen) return undefined;
		const handler = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isOpen, onClose]);

	const handleSubmit = () => {
		setError(null);
		try {
			if (!mint.trim()) {
				throw new Error("Mint address is required");
			}
			onSubmit({
				mint: mint.trim(),
				endpoint: endpoint.trim() ? endpoint.trim() : undefined,
				cloneAccounts,
				holders:
					cloneAccounts && !allAccounts && holders.trim()
						? Number(holders)
						: undefined,
				allAccounts,
			});
			setMint("");
			setEndpoint("");
			setHolders("20");
			setAllAccounts(false);
		} catch (err: unknown) {
			const message =
				err && typeof err === "object" && "message" in err
					? String((err as { message?: unknown }).message)
					: String(err);
			setError(message);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				className="absolute inset-0 bg-black/80 backdrop-blur-sm"
				aria-label="Close modal"
				onClick={onClose}
			/>

			<div className="w-full max-w-lg relative rounded-lg border border-border bg-card text-card-foreground shadow-2xl">
				<div className="p-6 border-b border-border">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<h3 className="text-xl font-semibold">Clone Token</h3>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center"
							aria-label="Close modal"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>

				<div className="p-6 space-y-5">
					<div className="space-y-2">
						<label
							htmlFor={mintId}
							className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
						>
							Mint Address *
						</label>
						<input
							id={mintId}
							value={mint}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setMint(event.target.value)
							}
							placeholder="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
							className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md font-mono"
						/>
					</div>

					<div className="space-y-2">
						<label
							htmlFor={endpointId}
							className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
						>
							RPC Endpoint (Optional)
						</label>
						<input
							id={endpointId}
							value={endpoint}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setEndpoint(event.target.value)
							}
							placeholder="https://api.mainnet-beta.solana.com"
							className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
						/>
					</div>

					<div className="p-4 rounded-md bg-muted/50 border border-border space-y-3">
						<label className="flex items-center gap-3 cursor-pointer group">
							<input
								type="checkbox"
								checked={cloneAccounts}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setCloneAccounts(event.target.checked)
								}
								className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500"
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
							<div className="ml-7 space-y-4 pt-3 border-t border-border">
								<label className="flex items-center gap-3 cursor-pointer group">
									<input
										type="checkbox"
										checked={allAccounts}
										onChange={(event: ChangeEvent<HTMLInputElement>) =>
											setAllAccounts(event.target.checked)
										}
										className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500"
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
										<label
											htmlFor={holdersId}
											className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
										>
											Top Holders Limit
										</label>
										<input
											id={holdersId}
											value={holders}
											onChange={(event: ChangeEvent<HTMLInputElement>) =>
												setHolders(event.target.value)
											}
											placeholder="20"
											type="number"
											min="1"
											max="100"
											className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
										/>
										<p className="text-xs text-muted-foreground">
											Number of top holders to clone
										</p>
									</div>
								)}
							</div>
						)}
					</div>

					{error && (
						<div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
							<svg
								className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<p className="text-sm text-red-300">{error}</p>
						</div>
					)}
				</div>

				<div className="p-6 border-t border-border">
					<div className="flex justify-between items-center">
						<div className="text-xs text-muted-foreground">Clone SPL tokens from mainnet</div>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={onClose}
								disabled={isLoading}
								className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSubmit}
								disabled={isLoading || mint.trim().length === 0}
								className={`inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 ${isLoading || mint.trim().length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
							>
								{isLoading ? (
									<>
										<svg
											className="animate-spin w-4 h-4"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										<span>Cloning...</span>
									</>
								) : (
									<span>Clone</span>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
