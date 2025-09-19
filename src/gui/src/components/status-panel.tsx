import type { ApiStatus } from "../api";

interface Props {
	status: ApiStatus | null;
	loading: boolean;
	onRefresh: () => void;
}

const formatter = new Intl.NumberFormat("en-US");

export function StatusPanel({ status, loading, onRefresh }: Props) {
	return (
		<section className="glass-panel p-6">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
						<i className="fas fa-server text-green-400"></i>
					</div>
					<div>
						<h2 className="text-xl font-bold text-white">Network Status</h2>
						<p className="text-xs text-gray-500">
							Real-time blockchain metrics
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onRefresh}
					disabled={loading}
					className={`btn-secondary ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
				>
					<i className={`fas fa-sync-alt ${loading ? "animate-spin" : ""}`}></i>
					<span>{loading ? "Refreshing" : "Refresh"}</span>
				</button>
			</div>

			{status ? (
				<>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<StatusCard
							title="Current Slot"
							value={formatter.format(status.slot)}
							subtitle={`Raw: ${status.slotBigint}`}
							icon="fa-cube"
							color="purple"
						/>
						<StatusCard
							title="Block Height"
							value={formatter.format(status.blockHeight)}
							subtitle={`Raw: ${status.blockHeightBigint}`}
							icon="fa-layer-group"
							color="blue"
						/>
						<StatusCard
							title="Transactions"
							value={formatter.format(status.txCount)}
							subtitle={`Raw: ${status.txCountBigint}`}
							icon="fa-exchange-alt"
							color="amber"
						/>
						<StatusCard
							title="Faucet Balance"
							value={`${status.faucet.sol.toFixed(3)} SOL`}
							subtitle={`${status.faucet.address.slice(0, 10)}…`}
							icon="fa-wallet"
							color="green"
						/>
					</div>

					{status.latestBlockhash && (
						<div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
							<div className="flex items-center gap-2 mb-2">
								<i className="fas fa-fingerprint text-violet-400 text-xs"></i>
								<span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
									Latest Blockhash
								</span>
							</div>
							<p className="text-sm font-mono text-violet-300 break-all">
								{status.latestBlockhash}
							</p>
						</div>
					)}
				</>
			) : (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-600/20 to-gray-700/20 flex items-center justify-center mb-4">
						<i className="fas fa-server text-gray-500 text-2xl"></i>
					</div>
					<p className="text-gray-400 mb-2">No connection to RPC</p>
					<p className="text-sm text-gray-500">
						Start the RPC server to see network status
					</p>
				</div>
			)}
		</section>
	);
}

interface StatusCardProps {
	title: string;
	value: string;
	subtitle?: string;
	icon: string;
	color: "purple" | "blue" | "amber" | "green";
}

const colorClasses = {
	purple: "from-purple-500/20 to-violet-500/20 text-purple-400",
	blue: "from-blue-500/20 to-cyan-500/20 text-blue-400",
	amber: "from-amber-500/20 to-orange-500/20 text-amber-400",
	green: "from-green-500/20 to-emerald-500/20 text-green-400",
};

function StatusCard({ title, value, subtitle, icon, color }: StatusCardProps) {
	return (
		<div className="card group hover:scale-[1.02] transition-all duration-200">
			<div className="flex items-start justify-between mb-3">
				<div
					className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center group-hover:scale-110 transition-transform`}
				>
					<i className={`fas ${icon} text-sm`}></i>
				</div>
				<span className="status-dot online"></span>
			</div>
			<p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
				{title}
			</p>
			<p className="text-2xl font-bold text-white">{value}</p>
			{subtitle && (
				<p className="mt-2 text-xs text-gray-500 font-mono truncate">
					{subtitle}
				</p>
			)}
		</div>
	);
}
