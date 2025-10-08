import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	statusQuery,
	programsQuery,
	tokensQuery,
	airdropMutation,
	mintMutation,
	cloneProgramMutation,
	cloneTokenMutation,
} from "../api/queries";
import { Layout } from "./Layout";
import { StatusPanel } from "./StatusPanel";
import { AirdropMintForm } from "./AirdropMintForm";
import { ProgramsPanel } from "./ProgramsPanel";
import { TokensPanel } from "./TokensPanel";
import { useState } from "react";
import { CloneProgramModal } from "./CloneProgramModal";
import { CloneTokenModal } from "./CloneTokenModal";

export function Dashboard() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [programModalOpen, setProgramModalOpen] = useState(false);
	const [tokenModalOpen, setTokenModalOpen] = useState(false);

	const { data: status, isLoading: statusLoading } = useQuery(statusQuery);
	const { data: programs = [], isLoading: programsLoading } =
		useQuery(programsQuery);
	const { data: tokens = [], isLoading: tokensLoading } = useQuery(tokensQuery);

	const airdrop = useMutation({
		...airdropMutation,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["status"] });
			if (data.signature) {
				const sig = data.signature;
				toast.success(
					<div className="flex items-center gap-2">
						<span>Airdrop successful</span>
					</div>,
					{
						description: `Transaction: ${sig.slice(0, 8)}...${sig.slice(-8)}`,
						action: {
							label: "View Details",
							onClick: () => navigate({ to: "/transactions/$signature", params: { signature: sig } }),
						},
					}
				);
			}
		},
		onError: (error) => {
			toast.error("Airdrop failed", {
				description: error.message,
			});
		},
	});

	const mintTokens = useMutation({
		...mintMutation,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["status"] });
			queryClient.invalidateQueries({ queryKey: ["tokens"] });
			if (data.signature) {
				const sig = data.signature;
				toast.success(
					<div className="flex items-center gap-2">
						<span>Tokens minted</span>
					</div>,
					{
						description: `Transaction: ${sig.slice(0, 8)}...${sig.slice(-8)}`,
						action: {
							label: "View Details",
							onClick: () => navigate({ to: "/transactions/$signature", params: { signature: sig } }),
						},
					}
				);
			}
		},
		onError: (error) => {
			toast.error("Minting failed", {
				description: error.message,
			});
		},
	});

	const cloneProgram = useMutation({
		...cloneProgramMutation,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["programs"] });
			setProgramModalOpen(false);
			toast.success("Program cloned successfully");
		},
		onError: (error) => {
			toast.error("Failed to clone program", {
				description: error.message,
			});
		},
	});

	const cloneToken = useMutation({
		...cloneTokenMutation,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tokens"] });
			setTokenModalOpen(false);
			toast.success("Token cloned successfully");
		},
		onError: (error) => {
			toast.error("Failed to clone token", {
				description: error.message,
			});
		},
	});

	return (
		<Layout>
			<div className="p-6 space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold">Dashboard</h1>
						<p className="text-sm text-muted-foreground">
							Manage your local Solana development environment
						</p>
					</div>
					<button
						type="button"
						onClick={() =>
							queryClient.invalidateQueries({ queryKey: ["status"] })
						}
						className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						<svg
							className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`}
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
						Refresh
					</button>
				</div>

				{/* Status Panel */}
				<StatusPanel
					status={status ?? null}
					loading={statusLoading}
					onRefresh={() =>
						queryClient.invalidateQueries({ queryKey: ["status"] })
					}
				/>

				{/* Quick Actions */}
				<AirdropMintForm
					tokens={tokens}
					onAirdrop={async (address, lamports) => {
						await airdrop.mutateAsync({ address, lamports });
					}}
					onMint={async (mintAddr, owner, amountRaw) => {
						await mintTokens.mutateAsync({ mint: mintAddr, owner, amountRaw });
					}}
				/>

				{/* Programs and Tokens */}
				<div className="space-y-6">
					<ProgramsPanel
						programs={programs}
						loading={programsLoading}
						onRefresh={() =>
							queryClient.invalidateQueries({ queryKey: ["programs"] })
						}
						onAdd={() => setProgramModalOpen(true)}
					/>
					<TokensPanel
						tokens={tokens}
						loading={tokensLoading}
						onRefresh={() =>
							queryClient.invalidateQueries({ queryKey: ["tokens"] })
						}
						onAdd={() => setTokenModalOpen(true)}
					/>
				</div>
			</div>

			{/* Modals */}
			<CloneProgramModal
				isOpen={programModalOpen}
				onClose={() => setProgramModalOpen(false)}
				onSubmit={(payload) => cloneProgram.mutate(payload)}
				isLoading={cloneProgram.isPending}
			/>
			<CloneTokenModal
				isOpen={tokenModalOpen}
				onClose={() => setTokenModalOpen(false)}
				onSubmit={(payload) => cloneToken.mutate(payload)}
				isLoading={cloneToken.isPending}
			/>
		</Layout>
	);
}
