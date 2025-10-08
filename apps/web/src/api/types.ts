export interface ApiConfig {
	rpcUrl: string;
}

export interface ApiStatus {
	slot: number;
	slotBigint: string;
	blockHeight: number;
	blockHeightBigint: string;
	txCount: number;
	txCountBigint: string;
	latestBlockhash: string;
	epoch: {
		epoch: number;
		slotIndex: number;
		slotsInEpoch: number;
		absoluteSlot: number;
		transactionCount: number;
	};
	faucet: {
		address: string;
		lamports: string;
		sol: number;
	};
}

export interface ProgramSummary {
	programId: string;
	owner: string;
	executable: boolean;
	dataLen: number;
	lamports: string;
}

export interface TokenSummary {
	mint: string;
	supply: string;
	decimals: number;
	uiAmount: number;
	uiAmountString: string;
	mintAuthority: string | null;
	isInitialized: boolean;
}

export interface AirdropPayload {
	address: string;
	lamports?: string | number;
	sol?: string | number;
}

export interface MintPayload {
	mint: string;
	owner: string;
	amountRaw: string;
}

export interface CloneProgramPayload {
	programId: string;
	endpoint?: string;
	withAccounts?: boolean;
	accountsLimit?: number;
}

export interface CloneTokenPayload {
	mint: string;
	endpoint?: string;
	cloneAccounts?: boolean;
	holders?: number;
	allAccounts?: boolean;
}

export interface Transaction {
	signature: string;
	slot: number;
	blockTime: number | null;
	err: unknown | null;
}

export interface ParsedInstruction {
	programId: string;
	program?: string;
	parsed?: {
		type: string;
		info: Record<string, unknown>;
	};
	accounts?: string[];
	data?: string;
	stackHeight?: number | null;
}

export interface InnerInstruction {
	index: number;
	instructions: ParsedInstruction[];
}

export interface TransactionDetails {
	signature: string;
	slot: number;
	blockTime: number | null;
	version?: number | string;
	meta: {
		fee: number;
		computeUnitsConsumed?: number | null;
		err: unknown | null;
		status?: { Ok: null } | { Err: unknown };
		logMessages?: string[];
		innerInstructions?: InnerInstruction[];
		preBalances?: number[];
		postBalances?: number[];
		preTokenBalances?: unknown[];
		postTokenBalances?: unknown[];
		returnData?: {
			programId: string;
			data: [string, string];
		} | null;
	};
	transaction: {
		signatures: string[];
		message: {
			accountKeys: Array<{
				pubkey: string;
				signer: boolean;
				writable: boolean;
			}>;
			recentBlockhash: string;
			instructions: ParsedInstruction[];
			header?: {
				numRequiredSignatures: number;
				numReadonlySignedAccounts: number;
				numReadonlyUnsignedAccounts: number;
			};
			addressTableLookups?: unknown[];
		};
	};
}
