import type { ApiStatus } from "../api/types";
import { Clock, Blocks, Activity, Coins } from "lucide-react";

interface Props {
	status: ApiStatus | null;
	loading: boolean;
	onRefresh: () => void;
}

const formatter = new Intl.NumberFormat("en-US");

export function StatusPanel({ status, loading, onRefresh }: Props) {
	return (
		<section className="rounded-lg border border-border bg-card text-card-foreground p-6">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
						<svg
							className="w-5 h-5 text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
							/>
						</svg>
					</div>
					<div>
						<h2 className="text-xl font-bold text-foreground">Network Status</h2>
						<p className="text-xs text-muted-foreground">Real-time blockchain metrics</p>
					</div>
				</div>
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
			</div>

			{status ? (
				<>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<StatusCard
							title="Current Slot"
							value={formatter.format(status.slot)}
							subtitle={`Raw: ${status.slotBigint}`}
							color="purple"
							icon={<Clock className="w-5 h-5" />}
						/>
						<StatusCard
							title="Block Height"
							value={formatter.format(status.blockHeight)}
							subtitle={`Raw: ${status.blockHeightBigint}`}
							color="blue"
							icon={<Blocks className="w-5 h-5" />}
						/>
						<StatusCard
							title="Transactions"
							value={formatter.format(status.txCount)}
							subtitle={`Raw: ${status.txCountBigint}`}
							color="amber"
							icon={<Activity className="w-5 h-5" />}
						/>
						<StatusCard
							title="Faucet Balance"
							value={`${status.faucet.sol.toFixed(3)} SOL`}
							subtitle={`${status.faucet.address.slice(0, 10)}…`}
							color="green"
							icon={<Coins className="w-5 h-5" />}
						/>
					</div>

					{status.epoch && (
						<div className="mt-6 p-4 rounded-lg border border-border bg-card text-card-foreground">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<svg
										className="w-4 h-4 text-cyan-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Epoch {status.epoch.epoch}
									</span>
								</div>
								<span className="text-xs text-muted-foreground">
									{formatter.format(status.epoch.slotIndex)} / {formatter.format(status.epoch.slotsInEpoch)} slots
								</span>
							</div>
							<div className="relative h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
								<div
									className="absolute h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
									style={{
										width: `${(status.epoch.slotIndex / status.epoch.slotsInEpoch) * 100}%`,
									}}
								/>
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								{((status.epoch.slotIndex / status.epoch.slotsInEpoch) * 100).toFixed(2)}% complete
							</p>
						</div>
					)}

					{status.latestBlockhash && (
						<div className="mt-4 p-4 rounded-lg border border-border bg-card text-card-foreground">
							<div className="flex items-center gap-2 mb-2">
								<svg
									className="w-4 h-4 text-violet-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
									/>
								</svg>
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Latest Blockhash
								</span>
							</div>
							<p className="text-sm font-mono text-foreground break-all">
								{status.latestBlockhash}
							</p>
						</div>
					)}
				</>
			) : (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
						<svg
							className="w-8 h-8 text-muted-foreground"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
							/>
						</svg>
					</div>
					<p className="text-foreground mb-2">No connection to RPC</p>
					<p className="text-sm text-muted-foreground">
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
	color: "purple" | "blue" | "amber" | "green";
	icon?: React.ReactNode;
}

const colorClasses = {
	purple: "from-purple-500/20 to-violet-500/20",
	blue: "from-blue-500/20 to-cyan-500/20",
	amber: "from-amber-500/20 to-orange-500/20",
	green: "from-green-500/20 to-emerald-500/20",
};

const iconColors = {
	purple: "text-purple-400",
	blue: "text-blue-400",
	amber: "text-amber-400",
	green: "text-green-400",
};

function StatusCard({ title, value, subtitle, color, icon }: StatusCardProps) {
	return (
		<div className="rounded-lg border border-border bg-card text-card-foreground p-4 group hover:border-ring transition-all duration-200">
			<div className="flex items-start justify-between mb-3">
				<div
					className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center group-hover:scale-110 transition-transform ${iconColors[color]}`}
				>
					{icon || <span className="status-dot online" />}
				</div>
			</div>
			<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
				{title}
			</p>
			<p className="text-2xl font-bold text-foreground">{value}</p>
			{subtitle && (
				<p className="mt-2 text-xs text-muted-foreground font-mono truncate">
					{subtitle}
				</p>
			)}
		</div>
	);
}
