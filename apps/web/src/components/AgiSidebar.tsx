import { useEffect, useCallback, useState } from "react";
import { X, Plus, Loader2, ExternalLink } from "lucide-react";
import { useAgiStore } from "../stores/agiStore";
import {
	MessageThreadContainer,
	ChatInputContainer,
	SessionListContainer,
} from "@agi-cli/web-sdk";
import { useCreateSession, useSessions, useConfig } from "@agi-cli/web-sdk";
import "./AgiSidebar.css";

export function AgiSidebar({ userContext }: { userContext?: string }) {
	const isOpen = useAgiStore((state) => state.isOpen);
	const setOpen = useAgiStore((state) => state.setOpen);
	const activeSessionId = useAgiStore((state) => state.activeSessionId);
	const setActiveSessionId = useAgiStore((state) => state.setActiveSessionId);

	const [showSessionList, setShowSessionList] = useState(false);
	const [initError, setInitError] = useState<string | null>(null);

	const { data: sessions, isLoading: sessionsLoading } = useSessions();
	const {
		data: config,
		isLoading: configLoading,
		error: configError,
	} = useConfig();
	const createSession = useCreateSession();

	// Monitor config loading and errors
	useEffect(() => {
		if (configError) {
			console.error("Failed to load AGI config:", configError);
			setInitError(
				"Cannot connect to AGI server. Make sure it's running on port 3456.",
			);
		} else if (config) {
			console.log("AGI config loaded:", config);
			setInitError(null);
		}
	}, [config, configError]);

	// Auto-select first session if none is selected
	useEffect(() => {
		if (!activeSessionId && sessions && sessions.length > 0) {
			setActiveSessionId(sessions[0].id);
		}
	}, [sessions, activeSessionId, setActiveSessionId]);

	const handleNewSession = useCallback(async () => {
		try {
			const session = await createSession.mutateAsync({
				agent: "general",
			});
			setActiveSessionId(session.id);
			setShowSessionList(false);
		} catch (error) {
			console.error("Failed to create session:", error);
		}
	}, [createSession, setActiveSessionId]);

	const handleSelectSession = useCallback(
		(sessionId: string) => {
			setActiveSessionId(sessionId);
			setShowSessionList(false);
		},
		[setActiveSessionId],
	);

	const handleOpenInFullUI = useCallback(() => {
		if (activeSessionId) {
			const baseUrl =
				import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3456";
			const fullUIUrl = `${baseUrl}/ui/sessions/${activeSessionId}`;
			window.open(fullUIUrl, "_blank");
		}
	}, [activeSessionId]);

	// Show loading only while config is actually loading
	if (configLoading && !config) {
		return (
			<>
				{isOpen && (
					<>
						<div
							className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-200"
							onClick={() => setOpen(false)}
							aria-hidden="true"
						/>
						<div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl transform flex-col border-l border-border bg-background shadow-2xl translate-x-0">
							<div className="flex h-14 items-center justify-between border-b border-border px-4">
								<h2 className="text-lg font-semibold">AI Assistant</h2>
								<button
									type="button"
									onClick={() => setOpen(false)}
									className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
									aria-label="Close sidebar"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
							<div className="flex flex-1 items-center justify-center">
								<div className="flex flex-col items-center gap-3">
									<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
									<p className="text-sm text-muted-foreground">
										Loading AGI configuration...
									</p>
								</div>
							</div>
						</div>
					</>
				)}
			</>
		);
	}

	return (
		<>
			{/* Backdrop */}
			{isOpen && (
				<div
					className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-200"
					onClick={() => setOpen(false)}
					aria-hidden="true"
				/>
			)}

			{/* Sidebar */}
			<div
				className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl transform flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out ${
					isOpen ? "translate-x-0" : "translate-x-full"
				}`}
			>
				{/* Header */}
				<div className="flex h-14 items-center justify-between border-b border-border px-4 flex-shrink-0 z-10">
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-semibold">AI Assistant</h2>
						{activeSessionId && !showSessionList && (
							<button
								type="button"
								onClick={() => setShowSessionList(true)}
								className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
							>
								Switch Session
							</button>
						)}
					</div>
					<div className="flex items-center gap-2">
						{activeSessionId && !showSessionList && (
							<button
								type="button"
								onClick={handleOpenInFullUI}
								className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
								title="Open in Full UI"
							>
								<ExternalLink className="h-3.5 w-3.5" />
								Full UI
							</button>
						)}
						<button
							type="button"
							onClick={handleNewSession}
							disabled={createSession.isPending || !!initError}
							className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent transition-colors disabled:opacity-50"
							title="New Session"
						>
							{createSession.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							New
						</button>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
							aria-label="Close sidebar"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				{/* Content - Create positioning context for absolutely positioned web-sdk components */}
				<div className="agi-sidebar-content">
					{initError ? (
						<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
							<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
								<p className="text-sm font-medium text-destructive">
									Connection Error
								</p>
								<p className="mt-2 text-xs text-muted-foreground">
									{initError}
								</p>
							</div>
							<div className="text-xs text-muted-foreground">
								<p>Expected AGI server at:</p>
								<code className="mt-1 block rounded bg-muted px-2 py-1">
									{import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3456"}
								</code>
								<p className="mt-4">Check FIXED.md for help</p>
							</div>
						</div>
					) : showSessionList ? (
						<div className="flex flex-1 flex-col overflow-hidden">
							<div className="flex items-center justify-between border-b border-border px-4 py-3">
								<h3 className="text-sm font-medium">Sessions</h3>
								<button
									type="button"
									onClick={() => setShowSessionList(false)}
									className="text-xs text-muted-foreground hover:text-foreground"
								>
									Back to Chat
								</button>
							</div>
							<div className="flex-1 overflow-auto">
								<SessionListContainer
									activeSessionId={activeSessionId || undefined}
									onSelectSession={handleSelectSession}
								/>
							</div>
						</div>
					) : activeSessionId ? (
						<>
							{/* Messages - Wrapper with positioning context */}
							<div className="agi-message-thread-wrapper">
								<MessageThreadContainer sessionId={activeSessionId} />
							</div>
					{/* Chat Input - Wrapper with positioning context */}
					<div className="agi-chat-input-wrapper">
						<ChatInputContainer sessionId={activeSessionId} userContext={userContext} />
					</div>
				</>
					) : (
						<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
							{sessionsLoading ? (
								<>
									<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
									<p className="text-sm text-muted-foreground">
										Loading sessions...
									</p>
								</>
							) : (
								<>
									<div className="text-muted-foreground">
										<p className="text-lg font-medium">No active session</p>
										<p className="mt-2 text-sm">
											Create a new session to start chatting with the AI
											assistant
										</p>
									</div>
									<button
										type="button"
										onClick={handleNewSession}
										disabled={createSession.isPending}
										className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
									>
										{createSession.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Plus className="h-4 w-4" />
										)}
										Create New Session
									</button>
								</>
							)}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
