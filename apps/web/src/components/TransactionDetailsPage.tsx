import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "./Layout";
import { transactionQuery } from "../api/queries";
import type { ParsedInstruction } from "../api/types";

export function TransactionDetailsPage() {
	const { signature } = useParams({ from: "/transactions/$signature" });
	const { data: tx, isLoading, error } = useQuery(transactionQuery(signature));
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const [expandedSections, setExpandedSections] = useState({
		instructions: true,
		logs: true,
		innerInstructions: false,
		balanceChanges: false,
		tokenBalances: false,
		accountKeys: false,
	});

	const copyToClipboard = async (text: string, field: string) => {
		await navigator.clipboard.writeText(text);
		setCopiedField(field);
		setTimeout(() => setCopiedField(null), 2000);
	};

	const formatDate = (blockTime: number | null) => {
		if (!blockTime) return "Unknown";
		return new Date(blockTime * 1000).toLocaleString();
	};

	const truncate = (str: string, len = 20) => {
		if (str.length <= len) return str;
		return `${str.slice(0, len / 2)}...${str.slice(-len / 2)}`;
	};

	const toggleSection = (section: keyof typeof expandedSections) => {
		setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	if (isLoading) {
		return (
			<Layout>
				<div className="p-6">
					<div className="text-center text-muted-foreground">
						Loading transaction...
					</div>
				</div>
			</Layout>
		);
	}

	if (error || !tx) {
		return (
			<Layout>
				<div className="p-6">
					<div className="border rounded-lg bg-card p-8 text-center">
						<h2 className="text-lg font-semibold text-destructive mb-2">
							Transaction Not Found
						</h2>
						<p className="text-sm text-muted-foreground mb-4">
							The transaction signature could not be found or retrieved.
						</p>
						<Link
							to="/transactions"
							className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
						>
							← Back to Transactions
						</Link>
					</div>
				</div>
			</Layout>
		);
	}

	const hasError = tx.meta?.err !== null;
	const logs = tx.meta?.logMessages || [];
	const innerInstructions = tx.meta?.innerInstructions || [];
	const accountKeys = tx.transaction?.message?.accountKeys || [];
	const instructions = tx.transaction?.message?.instructions || [];

	return (
		<Layout>
			<div className="p-6 space-y-4">
				<div className="flex items-center gap-4">
					<Link
						to="/transactions"
						className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						<svg
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 19l-7-7 7-7"
							/>
						</svg>
						Back
					</Link>
					<div>
						<h1 className="text-2xl font-semibold">Transaction Details</h1>
					</div>
				</div>

				{/* Status Badge */}
				<div className="border-border/50 border rounded-lg bg-card p-4">
					<div className="flex items-center justify-between flex-wrap gap-4">
						<div className="flex items-center gap-4">
							<span
								className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
									hasError
										? "bg-red-500/20 text-red-400 border border-red-500/30"
										: "bg-green-500/20 text-green-400 border border-green-500/30"
								}`}
							>
								<div
									className={`w-2 h-2 rounded-full ${hasError ? "bg-red-400" : "bg-green-400"}`}
								/>
								{hasError ? "Failed" : "Success"}
							</span>
							<div className="text-sm">
								<span className="text-muted-foreground">Slot:</span>{" "}
								<span className="font-mono">{tx.slot.toLocaleString()}</span>
							</div>
							<div className="text-sm">
								<span className="text-muted-foreground">Time:</span>{" "}
								{formatDate(tx.blockTime)}
							</div>
						</div>
					</div>
				</div>

				{/* Signature */}
				<div className="border-border/50 border rounded-lg bg-card p-4">
					<div className="text-xs font-medium text-muted-foreground mb-2">
						SIGNATURE
					</div>
					<div className="flex items-start gap-2">
						<code className="flex-1 font-mono text-sm break-all bg-muted/50 p-2 rounded">
							{signature}
						</code>
						<button
							type="button"
							onClick={() => copyToClipboard(signature, "signature")}
							className="p-2 hover:bg-muted rounded transition-colors shrink-0"
							title="Copy signature"
						>
							{copiedField === "signature" ? (
								<svg
									className="h-4 w-4 text-green-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							) : (
								<svg
									className="h-4 w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
							)}
						</button>
					</div>
					<div className="flex gap-2 mt-3">
						<a
							href={`https://solscan.io/tx/${signature}?cluster=custom&customUrl=http://localhost:8899`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded transition-colors"
						>
							<svg
								className="h-3.5 w-3.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
								/>
							</svg>
							View on Solscan
						</a>
						<a
							href={`https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded transition-colors"
						>
							<svg
								className="h-3.5 w-3.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
								/>
							</svg>
							View on Explorer
						</a>
					</div>
				</div>

				{/* Transaction Meta */}
				<div className="border-border/50 border rounded-lg bg-card p-4">
					<h3 className="text-sm font-semibold mb-3">Transaction Meta</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<div className="text-xs text-muted-foreground mb-1">Fee</div>
							<div className="font-mono text-sm font-medium">
								{(tx.meta.fee / 1_000_000_000).toFixed(9)} SOL
							</div>
							<div className="text-xs text-muted-foreground">
								{tx.meta.fee.toLocaleString()} lamports
							</div>
						</div>
						{tx.meta.computeUnitsConsumed != null && (
							<div>
								<div className="text-xs text-muted-foreground mb-1">
									Compute Units
								</div>
								<div className="font-mono text-sm font-medium">
									{tx.meta.computeUnitsConsumed.toLocaleString()}
								</div>
							</div>
						)}
						<div>
							<div className="text-xs text-muted-foreground mb-1">
								Recent Blockhash
							</div>
							<div className="flex items-center gap-1">
								<code className="font-mono text-xs">
									{truncate(tx.transaction?.message?.recentBlockhash || "", 12)}
								</code>
								<button
									type="button"
									onClick={() =>
										copyToClipboard(
											tx.transaction?.message?.recentBlockhash || "",
											"blockhash",
										)
									}
									className="p-1 hover:bg-muted rounded"
									title="Copy blockhash"
								>
									{copiedField === "blockhash" ? (
										<svg
											className="h-3 w-3 text-green-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>
									) : (
										<svg
											className="h-3 w-3"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
											/>
										</svg>
									)}
								</button>
							</div>
						</div>
						{tx.version !== undefined && (
							<div>
								<div className="text-xs text-muted-foreground mb-1">
									Version
								</div>
								<div className="font-mono text-sm font-medium">
									{tx.version === 0 ? "v0" : "legacy"}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Account Keys */}
				{accountKeys.length > 0 && (
					<div className="border-border/50 border rounded-lg bg-card">
						<button
							type="button"
							onClick={() => toggleSection("accountKeys")}
							className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
						>
							<h3 className="text-sm font-semibold">
								Account Keys ({accountKeys.length})
							</h3>
							<svg
								className={`h-5 w-5 transition-transform ${expandedSections.accountKeys ? "rotate-180" : ""}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{expandedSections.accountKeys && (
							<div className="px-4 pb-4 space-y-2">
								{accountKeys.map((key, idx) => (
									<div
										key={`${key}-${idx}`}
										className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-muted/30 rounded text-xs"
									>
										<div className="flex items-center gap-2 min-w-0 flex-1">
											<span className="text-muted-foreground font-mono shrink-0">
												#{idx}
											</span>
											<code className="font-mono break-all">{key.pubkey}</code>
										</div>
										<div className="flex gap-2 shrink-0">
											{key.signer && (
												<span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded whitespace-nowrap">
													Signer
												</span>
											)}
											{key.writable && (
												<span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded whitespace-nowrap">
													Writable
												</span>
											)}
											<button
												type="button"
												onClick={() =>
													copyToClipboard(key.pubkey, `account-${idx}`)
												}
												className="p-1 hover:bg-muted rounded"
												title="Copy account key"
											>
												{copiedField === `account-${idx}` ? (
													<svg
														className="h-3 w-3 text-green-500"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
														aria-hidden="true"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M5 13l4 4L19 7"
														/>
													</svg>
												) : (
													<svg
														className="h-3 w-3"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
														aria-hidden="true"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
														/>
													</svg>
												)}
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Instructions */}
				<div className="border-border/50 border rounded-lg bg-card">
					<button
						type="button"
						onClick={() => toggleSection("instructions")}
						className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
					>
						<h3 className="text-sm font-semibold">
							Instructions ({instructions.length})
						</h3>
						<svg
							className={`h-5 w-5 transition-transform ${expandedSections.instructions ? "rotate-180" : ""}`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>
					{expandedSections.instructions && (
						<div className="px-4 pb-4 space-y-3">
							{instructions.map((ix, idx) => (
								<InstructionCard
									key={`instruction-${idx}`}
									instruction={ix}
									index={idx}
									copyToClipboard={copyToClipboard}
									copiedField={copiedField}
								/>
							))}
						</div>
					)}
				</div>

				{/* Inner Instructions */}
				{innerInstructions.length > 0 &&
					innerInstructions.reduce(
						(acc, group) => acc + group.instructions.length,
						0,
					) > 0 && (
						<div className="border-border/50 border rounded-lg bg-card">
							<button
								type="button"
								onClick={() => toggleSection("innerInstructions")}
								className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
							>
								<h3 className="text-sm font-semibold">
									Inner Instructions (
									{innerInstructions.reduce(
										(acc, group) => acc + group.instructions.length,
										0,
									)}
									)
								</h3>
								<svg
									className={`h-5 w-5 transition-transform ${expandedSections.innerInstructions ? "rotate-180" : ""}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
							{expandedSections.innerInstructions && (
								<div className="px-4 pb-4 space-y-4">
									{innerInstructions.map((group) => (
										<div key={group.index} className="space-y-2">
											<div className="text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded">
												From Instruction #{group.index + 1}
											</div>
											<div className="pl-4 space-y-3 border-l-2 border-border/40">
												{group.instructions.map((ix, idx) => (
													<InstructionCard
														key={`inner-instruction-${idx}`}
														instruction={ix}
														index={idx}
														copyToClipboard={copyToClipboard}
														copiedField={copiedField}
														isInner
													/>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

				{/* Logs */}
				{logs.length > 0 && (
					<div className="border-border/50 border rounded-lg bg-card">
						<button
							type="button"
							onClick={() => toggleSection("logs")}
							className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
						>
							<h3 className="text-sm font-semibold">Logs ({logs.length})</h3>
							<svg
								className={`h-5 w-5 transition-transform ${expandedSections.logs ? "rotate-180" : ""}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{expandedSections.logs && (
							<div className="px-4 pb-4">
								<div className="bg-black/40 rounded p-3 font-mono text-xs space-y-1 max-h-96 overflow-auto">
									{logs.map((log, idx) => (
										<div
											key={`log-${idx}`}
											className={`${
												log.includes("failed") || log.includes("error")
													? "text-red-400"
													: log.includes("success")
														? "text-green-400"
														: "text-gray-300"
											}`}
										>
											<span className="text-muted-foreground mr-2">{idx}</span>
											{log}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* SOL Balance Changes */}
				{tx.meta.preBalances &&
					tx.meta.postBalances &&
					tx.meta.preBalances.length === tx.meta.postBalances.length && (
						<div className="border-border/50 border rounded-lg bg-card">
							<button
								type="button"
								onClick={() => toggleSection("balanceChanges")}
								className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
							>
								<h3 className="text-sm font-semibold">SOL Balance Changes</h3>
								<svg
									className={`h-5 w-5 transition-transform ${expandedSections.balanceChanges ? "rotate-180" : ""}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
							{expandedSections.balanceChanges && (
								<div className="px-4 pb-4 space-y-2">
									{tx.meta.preBalances.map((preBal, idx) => {
										const postBal = tx.meta.postBalances?.[idx] ?? 0;
										const change = postBal - preBal;
										if (change === 0) return null;

										return (
											<div
												key={`balance-${idx}`}
												className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded text-sm"
											>
												<div className="flex items-center gap-2 min-w-0 flex-1">
													<span className="text-muted-foreground font-mono shrink-0">
														#{idx}
													</span>
													{accountKeys[idx] && (
														<code className="text-xs truncate">
															{truncate(accountKeys[idx].pubkey, 16)}
														</code>
													)}
												</div>
												<div
													className={`font-mono font-medium shrink-0 whitespace-nowrap ${
														change > 0 ? "text-green-400" : "text-red-400"
													}`}
												>
													{change > 0 ? "+" : ""}
													{(change / 1_000_000_000).toFixed(9)} SOL
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}

				{/* Token Balance Changes */}
				{tx.meta.preTokenBalances &&
					tx.meta.postTokenBalances &&
					(tx.meta.preTokenBalances.length > 0 ||
						tx.meta.postTokenBalances.length > 0) && (
						<div className="border-border/50 border rounded-lg bg-card">
							<button
								type="button"
								onClick={() => toggleSection("tokenBalances")}
								className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
							>
								<h3 className="text-sm font-semibold">Token Balance Changes</h3>
								<svg
									className={`h-5 w-5 transition-transform ${expandedSections.tokenBalances ? "rotate-180" : ""}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
							{expandedSections.tokenBalances && (
								<div className="px-4 pb-4 space-y-2">
									{(() => {
										interface TokenBalance {
											accountIndex: number;
											mint: string;
											uiTokenAmount?: {
												amount: string;
												decimals: number;
												uiAmount: number;
												uiAmountString: string;
											};
										}

										const changes = new Map<
											number,
											{ pre?: TokenBalance; post?: TokenBalance }
										>();

										(
											(tx.meta.preTokenBalances as TokenBalance[]) || []
										).forEach((bal) => {
											const idx = bal.accountIndex;
											if (typeof idx === "number") {
												if (!changes.has(idx)) changes.set(idx, {});
												const entry = changes.get(idx);
												if (entry) entry.pre = bal;
											}
										});

										(
											(tx.meta.postTokenBalances as TokenBalance[]) || []
										).forEach((bal) => {
											const idx = bal.accountIndex;
											if (typeof idx === "number") {
												if (!changes.has(idx)) changes.set(idx, {});
												const entry = changes.get(idx);
												if (entry) entry.post = bal;
											}
										});

										return Array.from(changes.entries())
											.sort((a, b) => a[0] - b[0])
											.map(([idx, { pre, post }]) => {
												const preAmount =
													pre?.uiTokenAmount?.uiAmountString ||
													pre?.uiTokenAmount?.uiAmount?.toString() ||
													"0";
												const postAmount =
													post?.uiTokenAmount?.uiAmountString ||
													post?.uiTokenAmount?.uiAmount?.toString() ||
													"0";
												const mint = pre?.mint || post?.mint || "Unknown";

												const preNum = parseFloat(preAmount);
												const postNum = parseFloat(postAmount);
												const change = postNum - preNum;

												return (
													<div
														key={idx}
														className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-muted/30 rounded text-sm"
													>
														<div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
															<span className="text-muted-foreground font-mono text-xs shrink-0">
																#{idx}
															</span>
															{accountKeys[idx] && (
																<code className="text-xs font-mono truncate">
																	{truncate(accountKeys[idx].pubkey, 16)}
																</code>
															)}
															<div className="flex items-center gap-1 shrink-0">
																<code className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">
																	{truncate(mint, 12)}
																</code>
																<button
																	type="button"
																	onClick={() =>
																		copyToClipboard(mint, `mint-${idx}`)
																	}
																	className="p-1 hover:bg-muted rounded"
																	title="Copy mint"
																>
																	{copiedField === `mint-${idx}` ? (
																		<svg
																			className="h-3 w-3 text-green-500"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																			aria-hidden="true"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth={2}
																				d="M5 13l4 4L19 7"
																			/>
																		</svg>
																	) : (
																		<svg
																			className="h-3 w-3"
																			fill="none"
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																			aria-hidden="true"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth={2}
																				d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
																			/>
																		</svg>
																	)}
																</button>
															</div>
														</div>
														<div className="flex items-center gap-3 shrink-0">
															<div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
																{preAmount} → {postAmount}
															</div>
															{change !== 0 && (
																<div
																	className={`font-mono text-sm font-medium min-w-[80px] text-right ${
																		change > 0
																			? "text-green-400"
																			: "text-red-400"
																	}`}
																>
																	{change > 0 ? "+" : ""}
																	{change.toLocaleString()}
																</div>
															)}
														</div>
													</div>
												);
											});
									})()}
								</div>
							)}
						</div>
					)}
			</div>
		</Layout>
	);
}

function InstructionCard({
	instruction,
	index,
	copyToClipboard,
	copiedField,
	isInner = false,
}: {
	instruction: ParsedInstruction;
	index: number;
	copyToClipboard: (text: string, field: string) => void;
	copiedField: string | null;
	isInner?: boolean;
}) {
	const fieldId = isInner ? `inner-${index}` : `ix-${index}`;

	return (
		<div className="border-border/40 border rounded-lg p-3 bg-muted/20 space-y-3">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-muted-foreground">
						#{index + 1}
					</span>
					{instruction.program && (
						<span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
							{instruction.program}
						</span>
					)}
					{instruction.parsed?.type && (
						<span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
							{instruction.parsed.type}
						</span>
					)}
				</div>
			</div>

			<div>
				<div className="text-xs text-muted-foreground mb-1">Program ID</div>
				<div className="flex items-center gap-2">
					<code className="font-mono text-xs bg-muted/50 px-2 py-1 rounded flex-1 break-all">
						{instruction.programId}
					</code>
					<button
						type="button"
						onClick={() =>
							copyToClipboard(instruction.programId, `${fieldId}-program`)
						}
						className="p-1 hover:bg-muted rounded"
						title="Copy program ID"
					>
						{copiedField === `${fieldId}-program` ? (
							<svg
								className="h-3 w-3 text-green-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						) : (
							<svg
								className="h-3 w-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						)}
					</button>
				</div>
			</div>

			{instruction.parsed?.info && (
				<div>
					<div className="text-xs text-muted-foreground mb-1">
						Parsed Information
					</div>
					<div className="bg-muted/50 rounded p-2">
						<pre className="text-xs overflow-auto">
							{JSON.stringify(instruction.parsed.info, null, 2)}
						</pre>
					</div>
				</div>
			)}

			{instruction.accounts && instruction.accounts.length > 0 && (
				<div>
					<div className="text-xs text-muted-foreground mb-1">
						Accounts ({instruction.accounts.length})
					</div>
					<div className="space-y-1">
						{instruction.accounts.map((account, accIdx) => (
							<code
								key={`account-${accIdx}-${account}`}
								className="block font-mono text-xs bg-muted/50 px-2 py-1 rounded"
							>
								{accIdx}. {account}
							</code>
						))}
					</div>
				</div>
			)}

			{instruction.data && !instruction.parsed && (
				<div>
					<div className="text-xs text-muted-foreground mb-1">Data</div>
					<code className="block font-mono text-xs bg-muted/50 px-2 py-1 rounded break-all">
						{instruction.data}
					</code>
				</div>
			)}
		</div>
	);
}
