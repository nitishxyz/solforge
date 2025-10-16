import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { configQuery } from "../api/queries";
import { AgiFloatingButton } from "./AgiFloatingButton";
import { AgiSidebar } from "./AgiSidebar";

export function Layout({ 
	children,
	userContext,
}: { 
	children: React.ReactNode;
	userContext?: string;
}) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const router = useRouterState();
	const { data: config } = useQuery(configQuery);

	const isActive = (path: string) => {
		return router.location.pathname === path;
	};

	return (
		<div className="flex h-screen w-screen overflow-hidden bg-background">
			{/* Sidebar */}
			<aside
				className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
					sidebarOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex h-full flex-col">
					{/* Header */}
					<div className="flex h-14 items-center justify-between border-b border-border px-4">
						<h1 className="text-lg font-semibold">SolForge</h1>
						<button
							type="button"
							onClick={() => setSidebarOpen(false)}
							className="lg:hidden"
						>
							<svg
								className="h-5 w-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{/* Navigation */}
					<nav className="flex-1 space-y-1 p-2">
						<Link
							to="/"
							className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
								isActive("/")
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							}`}
							onClick={() => setSidebarOpen(false)}
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
									d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
								/>
							</svg>
							Dashboard
						</Link>

						<Link
							to="/transactions"
							className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
								isActive("/transactions")
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							}`}
							onClick={() => setSidebarOpen(false)}
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
									d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
								/>
							</svg>
							Transactions
						</Link>
					</nav>

					{/* Connection Status */}
					{config && (
						<div className="border-t border-border p-4">
							<div className="text-xs text-muted-foreground">RPC Endpoint</div>
							<div className="mt-1 truncate text-sm font-mono">
								{config.rpcUrl}
							</div>
						</div>
					)}
				</div>
			</aside>

			{/* Mobile overlay */}
			{sidebarOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden cursor-default"
					onClick={() => setSidebarOpen(false)}
					aria-label="Close sidebar"
				/>
			)}

			{/* Main content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Top bar */}
				<header className="flex h-14 items-center gap-4 border-b border-border px-4 lg:px-6">
					<button
						type="button"
						onClick={() => setSidebarOpen(true)}
						className="lg:hidden"
					>
						<svg
							className="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
					</button>
					<div className="flex-1" />
				</header>

				{/* Page content */}
				<main className="flex-1 overflow-auto">{children}</main>
			</div>

		{/* AGI Assistant Components */}
		<AgiFloatingButton />
		<AgiSidebar userContext={userContext} />
	</div>
	);
}
