import type { ProgramSummary } from "../api";

interface Props {
	programs: ProgramSummary[];
	loading: boolean;
	onRefresh: () => void;
	onAdd: () => void;
}

export function ProgramsPanel({ programs, loading, onRefresh, onAdd }: Props) {
	return (
		<section className="glass-panel p-6">
			<header className="flex flex-wrap items-center justify-between gap-3 mb-6">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
						<i className="fas fa-code text-blue-400"></i>
					</div>
					<div>
						<h2 className="text-xl font-bold text-white">Programs</h2>
						<p className="text-xs text-gray-500">
							{programs.length} deployed programs
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onRefresh}
						disabled={loading}
						className={`btn-secondary text-sm ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
					>
						<i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`}></i>
						<span>{loading ? "Refreshing" : "Refresh"}</span>
					</button>
					<button
						type="button"
						onClick={onAdd}
						className="btn-primary text-sm"
					>
						<i className="fas fa-plus"></i>
						<span>Add Program</span>
					</button>
				</div>
			</header>
			
			<div className="overflow-x-auto rounded-xl">
				{programs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600/20 to-cyan-600/20 flex items-center justify-center mb-4">
							<i className="fas fa-code text-blue-500 text-2xl"></i>
						</div>
						<p className="text-gray-400 mb-2">No programs deployed</p>
						<p className="text-sm text-gray-500">Click "Add Program" to clone from mainnet</p>
					</div>
				) : (
					<table className="table-modern">
						<thead>
							<tr>
								<th>Program ID</th>
								<th>Owner</th>
								<th>Status</th>
								<th>Data Size</th>
								<th>Balance</th>
							</tr>
						</thead>
						<tbody>
							{programs.map((program, index) => (
								<tr key={program.programId} style={{animationDelay: `${index * 50}ms`}} className="animate-fadeIn">
									<td>
										<div className="flex items-center gap-2">
											<i className="fas fa-cube text-blue-400 text-xs"></i>
											<span className="font-mono text-xs text-blue-300">
												{program.programId.slice(0, 8)}...{program.programId.slice(-6)}
											</span>
										</div>
									</td>
									<td>
										<span className="font-mono text-xs text-gray-400">
											{program.owner.slice(0, 8)}...
										</span>
									</td>
									<td>
										<span className={`badge ${program.executable ? 'badge-success' : 'badge-warning'}`}>
											<i className={`fas fa-${program.executable ? 'check' : 'pause'} text-xs`}></i>
											<span>{program.executable ? "Executable" : "Data Only"}</span>
										</span>
									</td>
									<td>
										<div className="flex items-center gap-2">
											<i className="fas fa-database text-gray-400 text-xs"></i>
											<span className="text-gray-300">
												{(program.dataLen / 1024).toFixed(1)} KB
											</span>
										</div>
									</td>
									<td>
										<div className="flex items-center gap-2">
											<i className="fas fa-wallet text-gray-400 text-xs"></i>
											<span className="text-gray-300">
												{(Number(BigInt(program.lamports)) / 1e9).toFixed(4)} SOL
											</span>
										</div>
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
