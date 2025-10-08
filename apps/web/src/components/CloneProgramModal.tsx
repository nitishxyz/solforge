import { type ChangeEvent, useId, useState, useEffect } from "react";
import type { CloneProgramPayload } from "../api/types";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (payload: CloneProgramPayload) => void;
	isLoading?: boolean;
}

export function CloneProgramModal({
	isOpen,
	onClose,
	onSubmit,
	isLoading = false,
}: Props) {
	const programIdId = useId();
	const endpointId = useId();
	const accountLimitId = useId();
	const [programId, setProgramId] = useState("");
	const [endpoint, setEndpoint] = useState("");
	const [withAccounts, setWithAccounts] = useState(true);
	const [accountsLimit, setAccountsLimit] = useState("100");
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
			if (!programId.trim()) {
				throw new Error("Program ID is required");
			}
			onSubmit({
				programId: programId.trim(),
				endpoint: endpoint.trim() ? endpoint.trim() : undefined,
				withAccounts,
				accountsLimit:
					withAccounts && accountsLimit.trim()
						? Number(accountsLimit)
						: undefined,
			});
			setProgramId("");
			setEndpoint("");
			setAccountsLimit("100");
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
								d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
								</svg>
								</div>
								<h3 className="text-xl font-semibold">Clone Program</h3>
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
							htmlFor={programIdId}
							className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
						>
							Program ID *
						</label>
						<input
							id={programIdId}
							value={programId}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setProgramId(event.target.value)
							}
							placeholder="TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
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
								checked={withAccounts}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setWithAccounts(event.target.checked)
								}
								className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500"
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
							<div className="ml-7 space-y-2 pt-2 border-t border-border">
								<label
									htmlFor={accountLimitId}
									className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
								>
									Account Limit
								</label>
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
									className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
								/>
								<p className="text-xs text-muted-foreground">
									Maximum number of accounts to clone
								</p>
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
						<div className="text-xs text-muted-foreground">
							Clone from Solana mainnet or custom RPC
						</div>
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
								disabled={isLoading || programId.trim().length === 0}
								className={`inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 ${isLoading || programId.trim().length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
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
