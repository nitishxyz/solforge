import type { TokenSummary } from "../api";

interface Props {
	tokens: TokenSummary[];
	loading: boolean;
	onRefresh: () => void;
	onAdd: () => void;
}

export function TokensPanel({ tokens, loading, onRefresh, onAdd }: Props) {
	return (
		<section className="rounded-xl bg-slate-900/60 p-6 shadow-soft backdrop-blur">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold text-slate-100">Tokens</h2>
					<p className="text-xs text-slate-500">
						SPL mints registered in LiteSVM.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onRefresh}
						disabled={loading}
						className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
					>
						{loading ? "Refreshing…" : "Refresh"}
					</button>
					<button
						type="button"
						onClick={onAdd}
						className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
					>
						Add token
					</button>
				</div>
			</header>
			<div className="mt-4 overflow-x-auto">
				{tokens.length === 0 ? (
					<p className="text-sm text-slate-500">No tokens registered yet.</p>
				) : (
					<table className="w-full min-w-full text-left text-sm text-slate-300">
						<thead className="text-xs uppercase text-slate-500">
							<tr>
								<th className="pb-2 pr-4">Mint</th>
								<th className="pb-2 pr-4">Supply</th>
								<th className="pb-2 pr-4">Decimals</th>
								<th className="pb-2 pr-4">Mint authority</th>
								<th className="pb-2">State</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800/60">
							{tokens.map((token) => (
								<tr key={token.mint} className="hover:bg-slate-900/80">
									<td className="py-2 pr-4 font-mono text-xs text-cyan-200">
										{token.mint}
									</td>
									<td className="py-2 pr-4 text-xs">{token.uiAmountString}</td>
									<td className="py-2 pr-4 text-xs">{token.decimals}</td>
									<td className="py-2 pr-4 font-mono text-xs text-slate-400">
										{token.mintAuthority ? token.mintAuthority : "None"}
									</td>
									<td className="py-2 text-xs">
										{token.isInitialized ? "Initialized" : "Uninitialized"}
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
