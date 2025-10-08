import type { TokenSummary } from "../api/types";

interface Props {
	tokens: TokenSummary[];
	loading: boolean;
	onRefresh: () => void;
	onAdd: () => void;
}

export function TokensPanel({ tokens, loading, onRefresh, onAdd }: Props) {
	return (
		<section className="rounded-lg border border-border bg-card text-card-foreground p-6">
			<header className="flex flex-wrap items-center justify-between gap-3 mb-6">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
						<svg
							className="w-5 h-5 text-amber-400"
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
					<div>
						<h2 className="text-xl font-bold text-foreground">Tokens</h2>
						<p className="text-xs text-muted-foreground">
							{tokens.length} SPL token{tokens.length !== 1 ? "s" : ""}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onRefresh}
						disabled={loading}
						className={`inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						<svg
							className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						<span>{loading ? "Refreshing" : "Refresh"}</span>
					</button>
					<button type="button" onClick={onAdd} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
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
								d="M12 4v16m8-8H4"
							/>
						</svg>
						<span>Add Token</span>
					</button>
				</div>
			</header>

			<div className="overflow-x-auto rounded-lg border border-border">
				{tokens.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
							<svg
								className="w-8 h-8 text-amber-500"
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
						<p className="text-foreground mb-2">No tokens created</p>
						<p className="text-sm text-muted-foreground">
							Click "Add Token" to clone from mainnet
						</p>
					</div>
				) : (
					<table className="w-full">
						<thead>
							<tr className="border-b border-border">
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Token Mint
								</th>
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Supply
								</th>
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Decimals
								</th>
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Mint Authority
								</th>
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Status
								</th>
							</tr>
						</thead>
						<tbody>
							{tokens.map((token) => (
								<tr
									key={token.mint}
									className="border-b border-border hover:bg-accent transition-colors"
								>
									<td className="py-3 px-4">
										<span className="font-mono text-xs text-amber-300">
											{token.mint.slice(0, 8)}...{token.mint.slice(-6)}
										</span>
									</td>
									<td className="py-3 px-4">
										<span className="text-foreground font-semibold text-sm">
											{token.uiAmountString}
										</span>
									</td>
									<td className="py-3 px-4">
										<span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
											{token.decimals}
										</span>
									</td>
									<td className="py-3 px-4">
										{token.mintAuthority ? (
											<span className="font-mono text-xs text-purple-300">
												{token.mintAuthority.slice(0, 8)}...
											</span>
										) : (
											<span className="text-muted-foreground text-sm">No authority</span>
										)}
									</td>
									<td className="py-3 px-4">
										<span
											className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
												token.isInitialized
													? "bg-green-500/10 text-green-400 border border-green-500/20"
													: "bg-amber-500/10 text-amber-400 border border-amber-500/20"
											}`}
										>
											{token.isInitialized ? "Active" : "Pending"}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</section>
	);
}
