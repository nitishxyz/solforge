import type { ApiStatus } from "../api";

interface Props {
	status: ApiStatus | null;
	loading: boolean;
	onRefresh: () => void;
}

const formatter = new Intl.NumberFormat("en-US");

export function StatusPanel({ status, loading, onRefresh }: Props) {
	return (
		<section className="rounded-xl bg-slate-900/60 p-6 shadow-soft backdrop-blur">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-slate-100">RPC Status</h2>
				<button
					type="button"
					onClick={onRefresh}
					disabled={loading}
					className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-100 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
				>
					{loading ? "Refreshing…" : "Refresh"}
				</button>
			</div>
			{status ? (
				<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatusCard
						title="Slot"
						value={formatter.format(status.slot)}
						subtitle={`Raw: ${status.slotBigint}`}
					/>
					<StatusCard
						title="Block height"
						value={formatter.format(status.blockHeight)}
						subtitle={`Raw: ${status.blockHeightBigint}`}
					/>
					<StatusCard
						title="Transactions"
						value={formatter.format(status.txCount)}
						subtitle={`Raw: ${status.txCountBigint}`}
					/>
					<StatusCard
						title="Faucet"
						value={`${status.faucet.sol.toFixed(3)} SOL`}
						subtitle={status.faucet.address.slice(0, 10) + "…"}
					/>
				</div>
			) : (
				<p className="mt-4 text-sm text-slate-400">
					Status unavailable. Start the RPC to populate data.
				</p>
			)}
			{status?.latestBlockhash ? (
				<p className="mt-4 truncate text-xs text-slate-500">
					Latest blockhash:{" "}
					<span className="text-slate-300">{status.latestBlockhash}</span>
				</p>
			) : null}
		</section>
	);
}

interface StatusCardProps {
	title: string;
	value: string;
	subtitle?: string;
}

function StatusCard({ title, value, subtitle }: StatusCardProps) {
	return (
		<div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
			<p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
			<p className="mt-2 text-xl font-semibold text-slate-100">{value}</p>
			{subtitle ? (
				<p className="mt-1 text-xs text-slate-500">{subtitle}</p>
			) : null}
		</div>
	);
}
