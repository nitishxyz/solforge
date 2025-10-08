import type { ProgramSummary } from "../api/types";

interface Props {
	programs: ProgramSummary[];
	loading: boolean;
	onRefresh: () => void;
	onAdd: () => void;
}

export function ProgramsPanel({ programs, loading, onRefresh, onAdd }: Props) {
	return (
		<section className="rounded-lg border border-border bg-card text-card-foreground p-6">
			<header className="flex flex-wrap items-center justify-between gap-3 mb-6">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
						<svg
							className="w-5 h-5 text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
							/>
						</svg>
					</div>
					<div>
						<h2 className="text-xl font-bold text-foreground">Programs</h2>
						<p className="text-xs text-muted-foreground">
							{programs.length} deployed program
							{programs.length !== 1 ? "s" : ""}
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
							aria-hidden="true"
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
					<button
						type="button"
						onClick={onAdd}
						className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4v16m8-8H4"
							/>
						</svg>
						<span>Add Program</span>
					</button>
				</div>
			</header>

			<div className="overflow-x-auto rounded-lg border border-border">
				{programs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
							<svg
								className="w-8 h-8 text-blue-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
							</svg>
						</div>
						<p className="text-foreground mb-2">No programs deployed</p>
						<p className="text-sm text-muted-foreground">
							Click "Add Program" to clone from mainnet
						</p>
					</div>
				) : (
					<table className="w-full">
						<thead>
							<tr className="border-b border-border">
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Program ID
								</th>
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Owner
								</th>
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Status
								</th>
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Data Size
								</th>
								<th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Balance
								</th>
							</tr>
						</thead>
						<tbody>
							{programs.map((program) => (
								<tr
									key={program.programId}
									className="border-b border-border hover:bg-accent transition-colors"
								>
									<td className="py-3 px-4">
										<span className="font-mono text-xs text-blue-300">
											{program.programId.slice(0, 8)}...
											{program.programId.slice(-6)}
										</span>
									</td>
									<td className="py-3 px-4">
										<span className="font-mono text-xs text-muted-foreground">
											{program.owner.slice(0, 8)}...
										</span>
									</td>
									<td className="py-3 px-4">
										<span
											className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
												program.executable
													? "bg-green-500/10 text-green-400 border border-green-500/20"
													: "bg-amber-500/10 text-amber-400 border border-amber-500/20"
											}`}
										>
											{program.executable ? "Executable" : "Data Only"}
										</span>
									</td>
									<td className="py-3 px-4">
										<span className="text-foreground text-sm">
											{(program.dataLen / 1024).toFixed(1)} KB
										</span>
									</td>
									<td className="py-3 px-4">
										<span className="text-foreground text-sm">
											{(Number(BigInt(program.lamports)) / 1e9).toFixed(4)} SOL
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
