import { useMemo } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { ChatMessage, ChatSession } from "../lib/types";
import { MessageComposer } from "./message-composer";
import { MessageThread } from "./message-thread";

interface ChatThreadProps {
	session: ChatSession | null;
	messages: ChatMessage[];
	loading: boolean;
	sending: boolean;
	onSend: (content: string) => Promise<void> | void;
}

export function ChatThread({
	session,
	messages,
	loading,
	sending,
	onSend,
}: ChatThreadProps) {
	const hasMessages = messages.length > 0;

	// Check if currently generating (assistant message pending)
	const isGenerating = useMemo(
		() =>
			messages.some((m) => m.role === "assistant" && m.status === "pending"),
		[messages],
	);

	return (
		<section className="flex flex-1 flex-col bg-background">
			{/* Main content area - takes remaining space */}
			<div className="flex-1 relative">
				{loading ? (
					<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Loading conversation…
					</div>
				) : !session ? (
					<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
						<div className="flex flex-col items-center gap-2">
							<Sparkles className="h-5 w-5" />
							<span>Select or create a session to begin.</span>
						</div>
					</div>
				) : hasMessages ? (
					<MessageThread
						messages={messages}
						session={session}
						isGenerating={isGenerating}
					/>
				) : (
					<div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
						<Sparkles className="mb-2 h-5 w-5" />
						No messages yet. Say hello to get started!
					</div>
				)}
			</div>

			{/* Input at bottom */}
			<MessageComposer onSubmit={onSend} disabled={!session || sending} />
		</section>
	);
}
