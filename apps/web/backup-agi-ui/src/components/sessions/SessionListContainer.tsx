import { memo, useMemo, useCallback } from 'react';
import { useSessions } from '../../hooks/useSessions';
import { SessionItem } from './SessionItem';
import { useSidebarStore } from '../../stores/sidebarStore';

interface SessionListContainerProps {
	activeSessionId?: string;
	onSelectSession: (sessionId: string) => void;
}

export const SessionListContainer = memo(function SessionListContainer({
	activeSessionId,
	onSelectSession,
}: SessionListContainerProps) {
	const { data: sessions = [], isLoading } = useSessions();
	const toggleCollapse = useSidebarStore((state) => state.toggleCollapse);

	const handleSessionClick = useCallback(
		(sessionId: string) => {
			onSelectSession(sessionId);
			// Close sidebar on mobile after selecting a session
			if (window.innerWidth < 768) {
				toggleCollapse();
			}
		},
		[onSelectSession, toggleCollapse],
	);

	// Create a stable reference that only changes when session count, titles, or agents change
	const sessionSnapshot = useMemo(() => {
		return sessions.map((s) => ({
			id: s.id,
			title: s.title,
			agent: s.agent,
			createdAt: s.createdAt,
		}));
	}, [sessions]);

	if (isLoading) {
		return (
			<div className="px-4 py-8 text-center text-sm text-muted-foreground/80">
				Loading sessions...
			</div>
		);
	}

	if (sessionSnapshot.length === 0) {
		return (
			<div className="px-4 py-8 text-center text-sm text-muted-foreground/80">
				No sessions yet. Create one to get started.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1 px-2 py-2 overflow-y-auto scrollbar-hide">
			{sessionSnapshot.map((session) => {
				const fullSession = sessions.find((s) => s.id === session.id);
				if (!fullSession) return null;

				return (
					<SessionItem
						key={session.id}
						session={fullSession}
						isActive={session.id === activeSessionId}
						onClick={() => handleSessionClick(session.id)}
					/>
				);
			})}
		</div>
	);
});
