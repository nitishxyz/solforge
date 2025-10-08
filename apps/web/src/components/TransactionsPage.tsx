import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Layout } from "./Layout";
import { transactionsQuery } from "../api/queries";

export function TransactionsPage() {
	const { data: transactions = [], isLoading } = useQuery(transactionsQuery);

	const formatAge = (blockTime: number | null) => {
		if (!blockTime) return "Unknown";
		const seconds = Math.floor(Date.now() / 1000 - blockTime);
		if (seconds < 60) return `${seconds}s ago`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return `${Math.floor(seconds / 86400)}d ago`;
	};

	const truncateSignature = (sig: string) => {
		return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
	};

	return (
		<Layout>
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold">Transactions</h1>
						<p className="text-sm text-muted-foreground">
							Recent transactions on your local Solana network
						</p>
					</div>
				</div>

				<div className="border rounded-lg bg-card overflow-hidden">
					{isLoading ? (
						<div className="p-8 text-center text-muted-foreground">
							Loading transactions...
						</div>
					) : transactions.length === 0 ? (
						<div className="p-8 text-center text-muted-foreground">
							No transactions yet
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="border-b bg-muted/50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
											Signature
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
											Status
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
											Slot
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
											Age
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{transactions.map((tx) => (
										<tr
											key={tx.signature}
											className="hover:bg-muted/50 transition-colors"
										>
											<td className="px-4 py-3">
												<Link
													to="/transactions/$signature"
													params={{ signature: tx.signature }}
													className="font-mono text-sm text-primary hover:underline"
												>
													{truncateSignature(tx.signature)}
												</Link>
											</td>
											<td className="px-4 py-3">
												<span
													className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
														tx.err
															? "bg-destructive/10 text-destructive"
															: "bg-green-500/10 text-green-500"
													}`}
												>
													{tx.err ? "Failed" : "Success"}
												</span>
											</td>
											<td className="px-4 py-3 font-mono text-sm">
												{tx.slot.toLocaleString()}
											</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">
												{formatAge(tx.blockTime)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</Layout>
	);
}
