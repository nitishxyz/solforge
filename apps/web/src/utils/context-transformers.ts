import type {
	ApiStatus,
	ProgramSummary,
	TokenSummary,
	TransactionDetails,
} from "../api/types";

export function transformDashboardContext(data: {
	status: ApiStatus | null;
	programs: ProgramSummary[];
	tokens: TokenSummary[];
}): string {
	const { status, programs, tokens } = data;

	const sections: string[] = [];

	if (status) {
		sections.push(`# Current Validator Status

- **Slot**: ${status.slot.toLocaleString()}
- **Block Height**: ${status.blockHeight.toLocaleString()}
- **Transaction Count**: ${status.txCount.toLocaleString()}
- **Latest Blockhash**: \`${status.latestBlockhash}\`
- **Epoch**: ${status.epoch.epoch}
  - Slot Index: ${status.epoch.slotIndex}
  - Slots in Epoch: ${status.epoch.slotsInEpoch}
  - Transaction Count: ${status.epoch.transactionCount}

## Faucet Account
- **Address**: \`${status.faucet.address}\`
- **Balance**: ${status.faucet.sol} SOL (${status.faucet.lamports} lamports)
`);
	}

	if (programs.length > 0) {
		sections.push(`# Programs (${programs.length})

${programs
	.map(
		(p, i) => `## Program ${i + 1}
- **Program ID**: \`${p.programId}\`
- **Owner**: \`${p.owner}\`
- **Executable**: ${p.executable}
- **Data Length**: ${p.dataLen.toLocaleString()} bytes
- **Balance**: ${(Number(p.lamports) / 1_000_000_000).toFixed(9)} SOL
`,
	)
	.join("\n")}
`);
	}

	if (tokens.length > 0) {
		sections.push(`# Tokens (${tokens.length})

${tokens
	.map(
		(t, i) => `## Token ${i + 1}
- **Mint Address**: \`${t.mint}\`
- **Supply**: ${t.uiAmountString} (${t.supply} raw)
- **Decimals**: ${t.decimals}
- **Mint Authority**: ${t.mintAuthority ? `\`${t.mintAuthority}\`` : "None"}
- **Initialized**: ${t.isInitialized}
`,
	)
	.join("\n")}
`);
	}

	if (sections.length === 0) {
		return "No data available on the dashboard.";
	}

	return sections.join("\n---\n\n");
}

export function transformTransactionContext(tx: TransactionDetails): string {
	const hasError = tx.meta?.err !== null;
	const sections: string[] = [];

	sections.push(`# Transaction Details

- **Signature**: \`${tx.signature}\`
- **Status**: ${hasError ? "❌ Failed" : "✅ Success"}
- **Slot**: ${tx.slot.toLocaleString()}
- **Block Time**: ${tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : "Unknown"}
- **Version**: ${tx.version === 0 ? "v0" : "legacy"}
`);

	sections.push(`## Transaction Meta

- **Fee**: ${(tx.meta.fee / 1_000_000_000).toFixed(9)} SOL (${tx.meta.fee.toLocaleString()} lamports)
${
	tx.meta.computeUnitsConsumed != null
		? `- **Compute Units**: ${tx.meta.computeUnitsConsumed.toLocaleString()}`
		: ""
}
- **Recent Blockhash**: \`${tx.transaction?.message?.recentBlockhash || "Unknown"}\`
`);

	const accountKeys = tx.transaction?.message?.accountKeys || [];
	if (accountKeys.length > 0) {
		sections.push(`## Account Keys (${accountKeys.length})

${accountKeys
	.map(
		(key, idx) =>
			`${idx}. \`${key.pubkey}\` ${key.signer ? "[Signer]" : ""} ${key.writable ? "[Writable]" : ""}`,
	)
	.join("\n")}
`);
	}

	const instructions = tx.transaction?.message?.instructions || [];
	if (instructions.length > 0) {
		sections.push(`## Instructions (${instructions.length})

${instructions
	.map((ix, idx) => {
		let content = `### Instruction ${idx + 1}
- **Program ID**: \`${ix.programId}\`
${ix.program ? `- **Program**: ${ix.program}` : ""}
${ix.parsed?.type ? `- **Type**: ${ix.parsed.type}` : ""}
`;

		if (ix.parsed?.info) {
			content += `\n**Parsed Info**:\n\`\`\`json\n${JSON.stringify(ix.parsed.info, null, 2)}\n\`\`\`\n`;
		}

		if (ix.accounts && ix.accounts.length > 0) {
			content += `\n**Accounts**: ${ix.accounts.length}\n${ix.accounts.map((acc, i) => `  ${i}. \`${acc}\``).join("\n")}\n`;
		}

		if (ix.data && !ix.parsed) {
			content += `\n**Data**: \`${ix.data}\`\n`;
		}

		return content;
	})
	.join("\n")}
`);
	}

	const innerInstructions = tx.meta?.innerInstructions || [];
	if (
		innerInstructions.length > 0 &&
		innerInstructions.reduce(
			(acc, group) => acc + group.instructions.length,
			0,
		) > 0
	) {
		const totalInner = innerInstructions.reduce(
			(acc, group) => acc + group.instructions.length,
			0,
		);
		sections.push(`## Inner Instructions (${totalInner})

${innerInstructions
	.map((group) => {
		return `### From Instruction #${group.index + 1}

${group.instructions
	.map((ix, idx) => {
		let content = `#### Inner Instruction ${idx + 1}
- **Program ID**: \`${ix.programId}\`
${ix.program ? `- **Program**: ${ix.program}` : ""}
${ix.parsed?.type ? `- **Type**: ${ix.parsed.type}` : ""}
`;

		if (ix.parsed?.info) {
			content += `\n**Parsed Info**:\n\`\`\`json\n${JSON.stringify(ix.parsed.info, null, 2)}\n\`\`\`\n`;
		}

		return content;
	})
	.join("\n")}
`;
	})
	.join("\n")}
`);
	}

	const logs = tx.meta?.logMessages || [];
	if (logs.length > 0) {
		sections.push(`## Logs (${logs.length})

\`\`\`
${logs.map((log, idx) => `${idx}. ${log}`).join("\n")}
\`\`\`
`);
	}

	if (
		tx.meta.preBalances &&
		tx.meta.postBalances &&
		tx.meta.preBalances.length === tx.meta.postBalances.length
	) {
		const changes = tx.meta.preBalances
			.map((preBal, idx) => {
				const postBal = tx.meta.postBalances?.[idx] ?? 0;
				const change = postBal - preBal;
				if (change === 0) return null;
				return {
					idx,
					change,
					account: accountKeys[idx]?.pubkey || "Unknown",
				};
			})
			.filter((c) => c !== null);

		if (changes.length > 0) {
			sections.push(`## SOL Balance Changes

${changes
	.map(
		(c) =>
			`- Account #${c.idx} (\`${c.account}\`): ${c.change > 0 ? "+" : ""}${(c.change / 1_000_000_000).toFixed(9)} SOL`,
	)
	.join("\n")}
`);
		}
	}

	return sections.join("\n");
}
