import { memo } from "react";
import type { ReactNode } from "react";
import type { Theme } from "../../hooks/useTheme";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { GitSidebarToggle } from "../git/GitSidebarToggle";
import { GitSidebar } from "../git/GitSidebar";
import { GitDiffPanel } from "../git/GitDiffPanel";
import { GitCommitModal } from "../git/GitCommitModal";

interface AppLayoutProps {
	sidebar: ReactNode;
	children: ReactNode;
	onNewSession?: () => void;
	theme: Theme;
	onToggleTheme: () => void;
}

export const AppLayout = memo(function AppLayout({
	sidebar,
	children,
	onNewSession,
	theme,
	onToggleTheme,
}: AppLayoutProps) {
	return (
		<div className="h-screen flex flex-col bg-background touch-manipulation">
			<Header onToggleTheme={onToggleTheme} theme={theme} />
			<div className="flex-1 flex overflow-hidden relative">
				{/* Left sidebar - Sessions */}
				<Sidebar onNewSession={onNewSession}>{sidebar}</Sidebar>

				{/* Main content area */}
				<main className="flex-1 flex flex-col overflow-hidden relative w-full md:w-auto">
					{/* Git diff panel overlays this when open */}
					<GitDiffPanel />
					{children}
				</main>

				{/* Right sidebar - Git (hidden on mobile) */}
				<div className="hidden md:block">
					<GitSidebarToggle />
					<GitSidebar />
				</div>
			</div>

			{/* Modals */}
			<GitCommitModal />
		</div>
	);
});
