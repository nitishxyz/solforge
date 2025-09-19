import { useCallback, useEffect, useId, useState } from "react";
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
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [activeSection, setActiveSection] = useState("status");

	const loadConfig = useCallback(async () => {
		try {
			const cfg = await fetchConfig();
			setConfig(cfg);
			setBannerError(null);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			setBannerError(message);
		}
	}, []);

	const loadStatus = useCallback(async () => {
		setLoadingStatus(true);
		try {
			const data = await fetchStatus();
			setStatus(data);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			setBannerError(message);
		} finally {
			setLoadingStatus(false);
		}
	}, []);

	const loadPrograms = useCallback(async () => {
		setLoadingPrograms(true);
		try {
			const data = await fetchPrograms();
			setPrograms(data);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			setBannerError(message);
		} finally {
			setLoadingPrograms(false);
		}
	}, []);

	const loadTokens = useCallback(async () => {
		setLoadingTokens(true);
		try {
			const data = await fetchTokens();
			setTokens(data);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			setBannerError(message);
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

	type SectionKey = "status" | "actions" | "programs" | "tokens";
	const uid = useId();
	const sectionIds: Record<SectionKey, string> = {
		status: `${uid}-status`,
		actions: `${uid}-actions`,
		programs: `${uid}-programs`,
		tokens: `${uid}-tokens`,
	};

	const scrollToSection = (sectionId: SectionKey) => {
		setActiveSection(sectionId);
		document
			.getElementById(sectionIds[sectionId])
			?.scrollIntoView({ behavior: "smooth" });
		setSidebarOpen(false);
	};

	return (
		<div className="min-h-screen relative">
			{/* Mobile Menu Button */}
			<button
				type="button"
				onClick={() => setSidebarOpen(!sidebarOpen)}
				className="lg:hidden fixed top-4 left-4 z-50 btn-icon bg-gradient-to-br from-purple-600 to-violet-600 border-purple-500/30"
				aria-label="Menu"
			>
				<i
					className={`fas fa-${sidebarOpen ? "times" : "bars"} text-white`}
				></i>
			</button>

			{/* Sidebar Navigation */}
			<aside
				className={`fixed top-0 left-0 h-full w-72 glass-panel rounded-none border-r border-white/5 z-40 transition-transform duration-300 ${
					sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
				}`}
			>
				<div className="p-6 space-y-8">
					{/* Logo */}
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shadow-lg">
							<i className="fas fa-fire text-white text-xl"></i>
						</div>
						<div>
							<h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
								SolForge
							</h1>
							<p className="text-xs text-gray-500">Development Suite</p>
						</div>
					</div>

					{/* Navigation Items */}
					<nav className="space-y-2">
						<button
							type="button"
							onClick={() => scrollToSection("status")}
							className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
								activeSection === "status"
									? "bg-gradient-to-r from-purple-600/20 to-violet-600/20 border border-purple-500/30 text-purple-300"
									: "text-gray-400 hover:bg-white/5"
							}`}
						>
							<i className="fas fa-server w-5"></i>
							<span className="font-medium">Network Status</span>
						</button>
						<button
							type="button"
							onClick={() => scrollToSection("actions")}
							className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
								activeSection === "actions"
									? "bg-gradient-to-r from-purple-600/20 to-violet-600/20 border border-purple-500/30 text-purple-300"
									: "text-gray-400 hover:bg-white/5"
							}`}
						>
							<i className="fas fa-paper-plane w-5"></i>
							<span className="font-medium">Quick Actions</span>
						</button>
						<button
							type="button"
							onClick={() => scrollToSection("programs")}
							className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
								activeSection === "programs"
									? "bg-gradient-to-r from-purple-600/20 to-violet-600/20 border border-purple-500/30 text-purple-300"
									: "text-gray-400 hover:bg-white/5"
							}`}
						>
							<i className="fas fa-code w-5"></i>
							<span className="font-medium">Programs</span>
						</button>
						<button
							type="button"
							onClick={() => scrollToSection("tokens")}
							className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
								activeSection === "tokens"
									? "bg-gradient-to-r from-purple-600/20 to-violet-600/20 border border-purple-500/30 text-purple-300"
									: "text-gray-400 hover:bg-white/5"
							}`}
						>
							<i className="fas fa-coins w-5"></i>
							<span className="font-medium">Tokens</span>
						</button>
					</nav>

					{/* Quick Stats */}
					{config && (
						<div className="space-y-3">
							<h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Connection
							</h3>
							<div className="p-3 rounded-xl bg-white/5 border border-white/10">
								<div className="flex items-center gap-2 mb-2">
									<span className="status-dot online"></span>
									<span className="text-xs text-gray-400">Connected</span>
								</div>
								<p className="text-xs text-gray-500 font-mono break-all">
									{config.rpcUrl}
								</p>
							</div>
						</div>
					)}
				</div>
			</aside>

			{/* Overlay for mobile */}
			{sidebarOpen && (
				<button
					type="button"
					className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
					aria-label="Close sidebar overlay"
					onClick={() => setSidebarOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
							setSidebarOpen(false);
						}
					}}
				/>
			)}

			{/* Main Content */}
			<main className={`transition-all duration-300 lg:ml-72 p-4 md:p-8`}>
				<div className="max-w-7xl mx-auto space-y-6">
					{/* Header - Only show on desktop */}
					<header className="glass-panel p-6 animate-fadeIn hidden md:block">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
							<div>
								<h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
									SolForge Dashboard
								</h2>
								<p className="text-gray-400 mt-1">
									Manage your local Solana development environment
								</p>
							</div>
							<button
								type="button"
								onClick={loadStatus}
								className="btn-secondary"
							>
								<i
									className={`fas fa-sync-alt ${loadingStatus ? "animate-spin" : ""}`}
								></i>
								<span>Refresh All</span>
							</button>
						</div>

						{/* Error Banner */}
						{bannerError && (
							<div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 flex items-start gap-3 animate-slideIn">
								<i className="fas fa-exclamation-circle text-red-400 mt-0.5"></i>
								<div className="flex-1">
									<p className="text-sm text-red-300">{bannerError}</p>
								</div>
								<button
									type="button"
									onClick={() => setBannerError(null)}
									className="text-red-400 hover:text-red-300"
									aria-label="Close error"
								>
									<i className="fas fa-times"></i>
								</button>
							</div>
						)}
					</header>

					{/* Mobile Header - Simpler version */}
					<div className="md:hidden mb-4">
						<h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
							SolForge
						</h2>
						{bannerError && (
							<div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
								<p className="text-xs text-red-300">{bannerError}</p>
							</div>
						)}
					</div>

					{/* Status Panel */}
					<div id={sectionIds.status} className="animate-fadeIn scroll-mt-24">
						<StatusPanel
							status={status}
							loading={loadingStatus}
							onRefresh={loadStatus}
						/>
					</div>

					{/* Quick Actions - Optional */}
					<div
						id={sectionIds.actions}
						className="glass-panel p-6 animate-fadeIn scroll-mt-24"
						style={{ animationDelay: "0.1s" }}
					>
						<AirdropMintForm
							tokens={tokens}
							onAirdrop={onAirdrop}
							onMint={onMint}
						/>
					</div>

					{/* Programs and Tokens Stacked */}
					<div className="space-y-6">
						<div
							id={sectionIds.programs}
							className="animate-fadeIn scroll-mt-24"
							style={{ animationDelay: "0.2s" }}
						>
							<ProgramsPanel
								programs={programs}
								loading={loadingPrograms}
								onRefresh={loadPrograms}
								onAdd={openProgramModal}
							/>
						</div>
						<div
							id={sectionIds.tokens}
							className="animate-fadeIn scroll-mt-24"
							style={{ animationDelay: "0.3s" }}
						>
							<TokensPanel
								tokens={tokens}
								loading={loadingTokens}
								onRefresh={loadTokens}
								onAdd={openTokenModal}
							/>
						</div>
					</div>
				</div>
			</main>

			{/* Modals */}
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

			<style jsx>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				
				@keyframes slideIn {
					from {
						opacity: 0;
						transform: translateX(-20px);
					}
					to {
						opacity: 1;
						transform: translateX(0);
					}
				}
				
				.animate-fadeIn {
					animation: fadeIn 0.6s ease-out forwards;
					opacity: 0;
				}
				
				.animate-slideIn {
					animation: slideIn 0.4s ease-out forwards;
				}
			`}</style>
		</div>
	);
}
