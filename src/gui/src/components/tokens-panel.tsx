import type { TokenSummary } from "../api";

interface Props {
	tokens: TokenSummary[];
	loading: boolean;
	onRefresh: () => void;
	onAdd: () => void;
}

export function TokensPanel({ tokens, loading, onRefresh, onAdd }: Props) {
	return (
		<section className="glass-panel p-6">
			<header className="flex flex-wrap items-center justify-between gap-3 mb-6">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
						<i className="fas fa-coins text-amber-400"></i>
					</div>
					<div>
						<h2 className="text-xl font-bold text-white">Tokens</h2>
						<p className="text-xs text-gray-500">{tokens.length} SPL tokens</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onRefresh}
						disabled={loading}
						className={`btn-secondary text-sm ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						<i
							className={`fas fa-sync-alt ${loading ? "animate-spin" : ""}`}
						></i>
						<span>{loading ? "Refreshing" : "Refresh"}</span>
					</button>
					<button type="button" onClick={onAdd} className="btn-primary text-sm">
						<i className="fas fa-plus"></i>
						<span>Add Token</span>
					</button>
				</div>
			</header>

			<div className="overflow-x-auto rounded-xl">
				{tokens.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600/20 to-orange-600/20 flex items-center justify-center mb-4">
							<i className="fas fa-coins text-amber-500 text-2xl"></i>
						</div>
						<p className="text-gray-400 mb-2">No tokens created</p>
						<p className="text-sm text-gray-500">
							Click "Add Token" to clone from mainnet
						</p>
					</div>
				) : (
					<table className="table-modern">
						<thead>
							<tr>
								<th>Token Mint</th>
								<th>Supply</th>
								<th>Decimals</th>
								<th>Authority</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{tokens.map((token, index) => (
								<tr
									key={token.mint}
									style={{ animationDelay: `${index * 50}ms` }}
									className="animate-fadeIn"
								>
									<td>
										<div className="flex items-center gap-2">
											<i className="fas fa-coin text-amber-400 text-xs"></i>
											<span className="font-mono text-xs text-amber-300">
												{token.mint.slice(0, 8)}...{token.mint.slice(-6)}
											</span>
										</div>
									</td>
									<td>
										<div className="flex items-center gap-2">
											<i className="fas fa-chart-line text-gray-400 text-xs"></i>
											<span className="text-gray-300 font-semibold">
												{token.uiAmountString}
											</span>
										</div>
									</td>
									<td>
										<span className="badge">{token.decimals}</span>
									</td>
									<td>
										{token.mintAuthority ? (
											<div className="flex items-center gap-2">
												<i className="fas fa-key text-purple-400 text-xs"></i>
												<span className="font-mono text-xs text-purple-300">
													{token.mintAuthority.slice(0, 8)}...
												</span>
											</div>
										) : (
											<span className="text-gray-500 text-sm">
												No authority
											</span>
										)}
									</td>
									<td>
										<span
											className={`badge ${token.isInitialized ? "badge-success" : "badge-warning"}`}
										>
											<i
												className={`fas fa-${token.isInitialized ? "check-circle" : "clock"} text-xs`}
											></i>
											<span>{token.isInitialized ? "Active" : "Pending"}</span>
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
