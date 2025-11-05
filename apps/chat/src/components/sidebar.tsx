import { clsx } from "clsx";
import { Loader2, MessageSquare, Plus } from "lucide-react";
import type { ChatSessionSummary } from "../lib/types";
import { formatRelativeTime } from "../lib/time";

interface SidebarProps {
	sessions: ChatSessionSummary[];
	selectedSessionId: string | null;
	onSelect: (sessionId: string) => void;
	onCreate: () => Promise<void> | void;
	loading?: boolean;
	creating?: boolean;
}

export function Sidebar({
	sessions,
	selectedSessionId,
	onSelect,
	onCreate,
	loading,
	creating,
}: SidebarProps) {
	return (
		<aside className="flex h-full w-80 flex-col border-r border-sidebar-border bg-sidebar">
			<div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
				<div className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
					<MessageSquare className="h-4 w-4" />
					Sessions
				</div>
				<button
					type="button"
					onClick={() => void onCreate()}
					disabled={creating}
					className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{creating ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : (
						<Plus className="h-3 w-3" />
					)}
					New
				</button>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
				{loading ? (
					<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Loading sessions…
					</div>
				) : sessions.length === 0 ? (
					<div className="mt-12 rounded-lg border border-dashed border-sidebar-border p-4 text-center text-xs text-muted-foreground">
						No conversations yet
						<div className="mt-2 text-[11px] opacity-75">
							Create a session to start chatting.
						</div>
					</div>
				) : (
					<ul className="space-y-1">
						{sessions.map((session) => {
							const isActive = session.id === selectedSessionId;
							return (
								<li key={session.id}>
									<button
										type="button"
										onClick={() => onSelect(session.id)}
										className={clsx(
											"w-full rounded-lg px-3 py-2.5 text-left transition",
											isActive
												? "bg-accent text-accent-foreground"
												: "hover:bg-accent/50",
										)}
									>
										<div className="flex items-center justify-between text-xs font-medium">
											<span className="truncate">
												{session.title?.trim() || session.model || "Untitled"}
											</span>
											<span className="text-[11px] text-muted-foreground ml-2">
												{formatRelativeTime(
													session.lastActiveAt ?? session.createdAt,
												)}
											</span>
										</div>
										{session.lastMessage ? (
											<p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
												{session.lastMessage.preview || "…"}
											</p>
										) : (
											<p className="mt-1 text-[11px] text-muted-foreground/70">
												No messages yet
											</p>
										)}
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</aside>
	);
}
