import { memo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { useGitStore } from '../../stores/gitStore';
import { useSidebarStore } from '../../stores/sidebarStore';
import { Button } from '../ui/Button';

interface SidebarProps {
	children: ReactNode;
	onNewSession?: () => void;
}

export const Sidebar = memo(function Sidebar({
	children,
	onNewSession,
}: SidebarProps) {
	const isDiffOpen = useGitStore((state) => state.isDiffOpen);
	const isCollapsed = useSidebarStore((state) => state.isCollapsed);
	const toggleCollapse = useSidebarStore((state) => state.toggleCollapse);

	useEffect(() => {
		if (!isCollapsed) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [isCollapsed]);

	if (isCollapsed) {
		return (
			<aside className="w-12 md:w-12 border-r border-border bg-background flex flex-col transition-all duration-300 ease-in-out hidden md:flex">
				<div className="h-14 border-b border-border flex items-center justify-center">
					<Button
						variant="ghost"
						size="icon"
						onClick={onNewSession}
						title="New session"
						className="rounded-full touch-manipulation"
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>

				<button
					type="button"
					className="flex-1 cursor-pointer hover:bg-muted/50 transition-colors touch-manipulation"
					onClick={!isDiffOpen ? toggleCollapse : undefined}
					title={!isDiffOpen ? 'Expand sidebar' : undefined}
					aria-label="Expand sidebar"
				/>

				<div className="border-t border-border p-2 flex items-center justify-center">
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleCollapse}
						title="Expand sidebar"
						disabled={isDiffOpen}
						className="transition-transform duration-200 hover:scale-110 touch-manipulation"
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
				</div>
			</aside>
		);
	}

	return (
		<>
			{!isCollapsed && (
				<div
					className="fixed inset-0 bg-black/50 z-10 md:hidden"
					onClick={toggleCollapse}
					aria-hidden="true"
				/>
			)}
			<aside className="w-full md:w-64 border-r border-border bg-background flex flex-col transition-all duration-300 ease-in-out absolute md:relative z-20 h-full md:h-auto">
				<div className="h-14 border-b border-border px-4 flex items-center">
					<Button
						variant="primary"
						size="sm"
						onClick={onNewSession}
						className="flex-1 touch-manipulation"
					>
						<Plus className="w-4 h-4 mr-2" />
						New Session
					</Button>
				</div>

				<div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>

				<div className="border-t border-border p-2 flex items-center justify-end">
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleCollapse}
						title="Collapse sidebar"
						disabled={isDiffOpen}
						className="transition-transform duration-200 hover:scale-110 touch-manipulation"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="transition-transform duration-300"
							role="img"
							aria-label="Collapse sidebar"
						>
							<title>Collapse sidebar</title>
							<path d="M15 18l-6-6 6-6" />
						</svg>
					</Button>
				</div>
			</aside>
		</>
	);
});
