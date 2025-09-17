import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type ApiConfig,
	type ApiStatus,
	cloneProgram,
	cloneToken,
	fetchConfig,
	fetchPrograms,
	fetchStatus,
	fetchTokens,
	type ProgramSummary,
	submitAirdrop,
	submitMint,
	type TokenSummary,
} from "./api";
import { AirdropMintForm } from "./components/airdrop-mint-form";
import { CloneProgramModal } from "./components/clone-program-modal";
import { CloneTokenModal } from "./components/clone-token-modal";
import { ProgramsPanel } from "./components/programs-panel";
import { StatusPanel } from "./components/status-panel";
import { TokensPanel } from "./components/tokens-panel";
import { useInterval } from "./hooks/use-interval";

export function App() {
	const [config, setConfig] = useState<ApiConfig | null>(null);
	const [status, setStatus] = useState<ApiStatus | null>(null);
	const [programs, setPrograms] = useState<ProgramSummary[]>([]);
	const [tokens, setTokens] = useState<TokenSummary[]>([]);
	const [loadingStatus, setLoadingStatus] = useState(false);
	const [loadingPrograms, setLoadingPrograms] = useState(false);
	const [loadingTokens, setLoadingTokens] = useState(false);
	const [programModalOpen, setProgramModalOpen] = useState(false);
	const [tokenModalOpen, setTokenModalOpen] = useState(false);
	const [bannerError, setBannerError] = useState<string | null>(null);

	const loadConfig = useCallback(async () => {
		try {
			const cfg = await fetchConfig();
			setConfig(cfg);
			setBannerError(null);
		} catch (error: any) {
			setBannerError(error?.message ?? String(error));
		}
	}, []);

	const loadStatus = useCallback(async () => {
		setLoadingStatus(true);
		try {
			const data = await fetchStatus();
			setStatus(data);
		} catch (error: any) {
			setBannerError(error?.message ?? String(error));
		} finally {
			setLoadingStatus(false);
		}
	}, []);

	const loadPrograms = useCallback(async () => {
		setLoadingPrograms(true);
		try {
			const data = await fetchPrograms();
			setPrograms(data);
		} catch (error: any) {
			setBannerError(error?.message ?? String(error));
		} finally {
			setLoadingPrograms(false);
		}
	}, []);

	const loadTokens = useCallback(async () => {
		setLoadingTokens(true);
		try {
			const data = await fetchTokens();
			setTokens(data);
		} catch (error: any) {
			setBannerError(error?.message ?? String(error));
		} finally {
			setLoadingTokens(false);
		}
	}, []);

	useEffect(() => {
		loadConfig();
		loadStatus();
		loadPrograms();
		loadTokens();
	}, [loadConfig, loadStatus, loadPrograms, loadTokens]);

	useInterval(loadStatus, 5_000);

	const onAirdrop = useCallback(
		async (address: string, lamports: string) => {
			const result = await submitAirdrop({ address, lamports });
			await loadStatus();
			return result.signature;
		},
		[loadStatus],
	);

	const onMint = useCallback(
		async (mint: string, owner: string, amountRaw: string) => {
			const result = await submitMint({ mint, owner, amountRaw });
			await Promise.all([loadStatus(), loadTokens()]);
			if (result && typeof result === "object" && "signature" in result) {
				return (result as { signature?: string }).signature;
			}
			return undefined;
		},
		[loadStatus, loadTokens],
	);

	const openProgramModal = () => setProgramModalOpen(true);
	const openTokenModal = () => setTokenModalOpen(true);

	const handleCloneProgram = useCallback(
		async (payload: {
			programId: string;
			endpoint?: string;
			withAccounts: boolean;
			accountsLimit?: number;
		}) => {
			await cloneProgram(payload);
			await loadPrograms();
		},
		[loadPrograms],
	);

	const handleCloneToken = useCallback(
		async (payload: {
			mint: string;
			endpoint?: string;
			cloneAccounts: boolean;
			holders?: number;
			allAccounts?: boolean;
		}) => {
			await cloneToken(payload);
			await loadTokens();
		},
		[loadTokens],
	);

	const summary = useMemo(() => {
		if (!config) return "";
		return `RPC: ${config.rpcUrl}`;
	}, [config]);

	return (
		<div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
			<div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
				<header className="rounded-xl bg-slate-900/60 p-6 shadow-soft backdrop-blur">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h1 className="text-2xl font-semibold text-slate-100">
								SolForge Dashboard
							</h1>
							<p className="text-sm text-slate-400">
								Manage your local LiteSVM instance.
							</p>
						</div>
						{summary ? (
							<span className="text-xs text-slate-500">{summary}</span>
						) : null}
					</div>
					{bannerError ? (
						<p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
							{bannerError}
						</p>
					) : null}
				</header>

				<AirdropMintForm
					tokens={tokens}
					onAirdrop={onAirdrop}
					onMint={onMint}
				/>
				<StatusPanel
					status={status}
					loading={loadingStatus}
					onRefresh={loadStatus}
				/>

				<div className="grid gap-6 lg:grid-cols-2">
					<ProgramsPanel
						programs={programs}
						loading={loadingPrograms}
						onRefresh={loadPrograms}
						onAdd={openProgramModal}
					/>
					<TokensPanel
						tokens={tokens}
						loading={loadingTokens}
						onRefresh={loadTokens}
						onAdd={openTokenModal}
					/>
				</div>
			</div>

			<CloneProgramModal
				isOpen={programModalOpen}
				onClose={() => setProgramModalOpen(false)}
				onSubmit={handleCloneProgram}
			/>
			<CloneTokenModal
				isOpen={tokenModalOpen}
				onClose={() => setTokenModalOpen(false)}
				onSubmit={handleCloneToken}
			/>
		</div>
	);
}
